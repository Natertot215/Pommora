import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stabilize } from '@shared/treeStabilize'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { readNexus } from './readNexus'
import type { WatchScope } from './exclusion'
import { ignoredUnder } from './watcher'
import { applyWatchEvents, classifyEvent, touchesCorpus, type WatchEvent } from './watchPatch'

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKACTAV9WEVGEMMVRZ'

let root: string

const abs = (...segs: string[]): string => join(root, ...segs)
const scope = (excluded: string[] = [], assetDir = ASSETS_DIR_REL): WatchScope => ({
  excluded,
  assetDir,
})
const ev = (event: WatchEvent['event'], ...segs: string[]): WatchEvent => ({
  event,
  absPath: abs(...segs),
})

// A sidecar-mode nexus with one Collection (one page), one Context group with one Space, and
// one un-adopted folder holding a loose note — the live tree's whole vocabulary in miniature.
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-watch-'))
  await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    abs('.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await writeFile(
    abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    JSON.stringify({ id: 'sp1' }),
  )
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\n---\n\nalpha\n`)
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'note.md'), 'links [[A]]\n')
})
afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('applyWatchEvents — must agree with the walk', () => {
  it('a batch of external edits patches to exactly the tree a fresh walk produces', async () => {
    await refreshTree(root)
    await writeFile(
      abs('Notes', 'B.md'),
      `---\nPageID: ${ULID_B}\nicon: book\n(Areas):\n  - Home\n---\n\nbeta\n`,
    )
    await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\nicon: star\n---\n\nalpha\n`)
    await writeFile(abs('Loose', 'second.md'), 'more\n')
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', icon: 'folder', page_order: [ULID_B, ULID_A] }),
    )
    await writeFile(
      abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      JSON.stringify({ id: 'sp1', color: 'mint' }),
    )
    await writeFile(
      abs('.nexus', 'settings.json'),
      JSON.stringify({ labels: { area: { singular: 'Realm', plural: 'Realms' } } }),
    )
    await writeFile(abs('.nexus', 'homepage.json'), JSON.stringify({ banner: 'Loose/b.png' }))

    const result = await applyWatchEvents(
      root,
      [
        ev('add', 'Notes', 'B.md'),
        ev('change', 'Notes', 'A.md'),
        ev('add', 'Loose', 'second.md'),
        ev('change', 'Notes', '_pagecollection.json'),
        ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
        ev('change', '.nexus', 'settings.json'),
        ev('change', '.nexus', 'homepage.json'),
      ],
      scope(),
    )
    expect(result).toBe('patched')

    const live = getLiveTree()
    expect(live).not.toBeNull()
    const notes = live?.collections[0]
    expect(notes?.icon).toBe('folder')
    expect(notes?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_A])
    expect(notes?.pages[0]?.contextValues).toEqual({ ctx1: ['sp1'] })
    expect(live?.contexts[0]?.spaces[0]?.color).toBe('mint')
    expect(live?.labels.area.singular).toBe('Realm')
    expect(live?.homepage.banner).toBe('Loose/b.png')

    const walked = await readNexus(root)
    expect(stabilize(walked, live)).toBe(live)
  })

  it('a page deleted between event and read applies as a remove, walk-identically', async () => {
    await refreshTree(root)
    await unlink(abs('Notes', 'A.md'))
    const result = await applyWatchEvents(root, [ev('change', 'Notes', 'A.md')], scope())
    expect(result).toBe('patched')
    const live = getLiveTree()
    expect(live?.collections[0]?.pages).toHaveLength(0)
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })

  it('a file with Unknown admission never enters the tree — the walk owns that bookkeeping', async () => {
    await refreshTree(root)
    await writeFile(abs('Notes', 'bad.md'), `---\nTaskID: ${ULID_B}\n---\n\nnope\n`)
    const result = await applyWatchEvents(root, [ev('add', 'Notes', 'bad.md')], scope())
    expect(result).toBe('refresh')
    expect(getLiveTree()?.collections[0]?.pages.map((p) => p.title)).toEqual(['A'])
  })

  it('a page whose id moved re-derives its position instead of swapping in place', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    await refreshTree(root)
    expect(getLiveTree()?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
    const ULID_C = '01CX5ZZKBKACTAV9WEVGEMMVRC'
    await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_C}\n---\n\nalpha\n`)
    expect(await applyWatchEvents(root, [ev('change', 'Notes', 'A.md')], scope())).toBe('patched')
    const live = getLiveTree()
    expect(live?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_C])
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })

  it('an empty batch is a no-op that preserves tree identity', async () => {
    await refreshTree(root)
    const before = getLiveTree()
    expect(await applyWatchEvents(root, [], scope())).toBe('patched')
    expect(getLiveTree()).toBe(before)
  })

  it('an exclusion change in settings is structural — refresh, never a leaf patch', async () => {
    await refreshTree(root)
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Loose'] }))
    expect(await applyWatchEvents(root, [ev('change', '.nexus', 'settings.json')], scope())).toBe(
      'refresh',
    )
  })

  it('a mixed batch with one unclassifiable event refreshes once, patching nothing', async () => {
    await refreshTree(root)
    const before = getLiveTree()
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    const result = await applyWatchEvents(
      root,
      [ev('add', 'Notes', 'B.md'), ev('change', '.nexus', 'contexts.json')],
      scope(),
    )
    expect(result).toBe('refresh')
    expect(getLiveTree()).toBe(before)
  })
})

describe('settings leaves — the walk and the settings patch must never disagree', () => {
  // readNexus.ts states the decoder, the walk's tree literal and applySettingsLeaves must never
  // disagree; a per-function test cannot see that, so this drives both over the same bytes.
  it('an asset_directory appearing on disk reaches the live tree exactly as a fresh walk reads it', async () => {
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({}))
    await refreshTree(root)
    expect(getLiveTree()?.assetDirectory).toBe(ASSETS_DIR_REL)

    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ asset_directory: 'Media/' }))
    // settle re-walks on a structural outcome; the patch alone must otherwise carry the leaf.
    if (
      (await applyWatchEvents(root, [ev('change', '.nexus', 'settings.json')], scope())) ===
      'refresh'
    )
      await refreshTree(root)

    const patched = getLiveTree()?.assetDirectory
    dropLiveTree()
    const walked = await readNexus(root)
    expect(patched).toBe('Media')
    expect(patched).toBe(walked.assetDirectory)
  })
})

describe('classifyEvent', () => {
  it('routes each path to its arm, with full-refresh as the total default', async () => {
    await refreshTree(root)
    const tree = getLiveTree()
    if (tree === null) throw new Error('no tree')
    const kind = (e: WatchEvent, excluded: string[] = []): string =>
      classifyEvent(tree, root, e, scope(excluded)).kind

    expect(kind(ev('add', 'Notes', 'B.md'))).toBe('page-upsert')
    expect(kind(ev('unlink', 'Notes', 'A.md'))).toBe('page-remove')
    expect(kind(ev('change', 'Notes', '_pagecollection.json'))).toBe('container-meta')
    expect(kind(ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'))).toBe(
      'space-meta',
    )
    expect(kind(ev('change', '.nexus', 'settings.json'))).toBe('settings-leaf')
    expect(kind(ev('change', '.nexus', 'homepage.json'))).toBe('homepage-leaf')
    expect(kind(ev('add', 'Loose', 'second.md'))).toBe('index-only')
    expect(kind(ev('add', 'root-note.md'))).toBe('index-only')
    expect(kind(ev('change', 'Hidden', 'x.md'), ['Hidden'])).toBe('ignored')

    // Structural walk inputs and the residue classes land on the default arm.
    expect(kind(ev('change', '.nexus', 'contexts.json'))).toBe('full-refresh')
    expect(kind(ev('change', '.nexus', 'properties.json'))).toBe('full-refresh')
    expect(kind(ev('change', '.nexus', 'state.json'))).toBe('full-refresh')
    expect(kind(ev('addDir', 'Notes', 'Sub'))).toBe('full-refresh')
    expect(kind(ev('unlinkDir', 'Notes'))).toBe('full-refresh')
    expect(kind(ev('unlink', 'Notes', '_pagecollection.json'))).toBe('full-refresh')
    expect(kind(ev('add', 'Loose', '_pageset.json'))).toBe('full-refresh')
    expect(kind(ev('change', 'Notes', 'photo.png'))).toBe('full-refresh')
    // A stray wrong-kind sidecar is not this container's meta — the walk ignores it.
    expect(kind(ev('change', 'Notes', '_pageset.json'))).toBe('full-refresh')
  })

  it('a raw nexus never classifies container-meta — the walk reads no sidecars there', async () => {
    const raw = await mkdtemp(join(tmpdir(), 'pom-raw-'))
    try {
      await mkdir(join(raw, 'Things'), { recursive: true })
      await writeFile(join(raw, 'Things', 'note.md'), 'text\n')
      dropLiveTree()
      const tree = await refreshTree(raw)
      const cls = classifyEvent(
        tree,
        raw,
        { event: 'change', absPath: join(raw, 'Things', '_pagecollection.json') },
        scope(),
      )
      expect(cls.kind).toBe('full-refresh')
    } finally {
      dropLiveTree()
      await rm(raw, { recursive: true, force: true })
    }
  })

  it('an event under an unreadable-listed owner defers to the walk', async () => {
    await writeFile(abs('Notes', '_pagecollection.json'), '{corrupt')
    await refreshTree(root)
    const tree = getLiveTree()
    if (tree === null) throw new Error('no tree')
    expect(tree.unreadable?.map((u) => u.path)).toContain('Notes')
    const cls = classifyEvent(tree, root, ev('change', 'Notes', '_pagecollection.json'), scope())
    expect(cls.kind).toBe('full-refresh')
  })
})

describe('the asset root outranks every other skip', () => {
  const ASSET_ROOTS = [ASSETS_DIR_REL, 'file-assets', '.attachments']

  it('every path under the asset root classifies asset, whatever the root is named', async () => {
    const tree = await refreshTree(root)
    for (const dir of ASSET_ROOTS) {
      const s = scope([], dir)
      const at = (...segs: string[]): string =>
        classifyEvent(tree, root, ev('change', ...dir.split('/'), ...segs), s).kind
      expect(at('x.png')).toBe('asset')
      expect(at('nested', 'deep', 'x.heic')).toBe('asset')
      // A dropped-in Markdown file is an asset too, or it rides index-only into the mentions rows.
      expect(at('notes.md')).toBe('asset')
      expect(classifyEvent(tree, root, ev('addDir', ...dir.split('/'), 'sub'), s).kind).toBe(
        'asset',
      )
      expect(classifyEvent(tree, root, ev('unlink', ...dir.split('/'), 'x.png'), s).kind).toBe(
        'asset',
      )
      expect(touchesCorpus(root, [ev('add', ...dir.split('/'), 'notes.md')], s)).toBe(false)
    }
  })

  it('outranks the exclusion match — an asset root named in excluded_folders still delivers', async () => {
    const tree = await refreshTree(root)
    expect(
      classifyEvent(
        tree,
        root,
        ev('change', 'file-assets', 'x.png'),
        scope(['file-assets'], 'file-assets'),
      ).kind,
    ).toBe('asset')
  })

  it('the negative control: the same event elsewhere is not an asset', async () => {
    const tree = await refreshTree(root)
    expect(
      classifyEvent(tree, root, ev('change', 'file-assets', 'x.png'), scope([], 'Media')).kind,
    ).toBe('full-refresh')
    expect(touchesCorpus(root, [ev('add', 'file-assets', 'notes.md')], scope([], 'Media'))).toBe(
      true,
    )
  })

  it('a batch of asset events patches without a walk', async () => {
    await refreshTree(root)
    const s = scope([], 'file-assets')
    const events = ['a.png', 'b.jpg', 'c.md'].map((n) => ev('add', 'file-assets', n))
    expect(await applyWatchEvents(root, events, s)).toBe('patched')
  })

  it('the root escapes the cruft rules; what sits below it does not', async () => {
    // A root named `.attachments` is what the exemption exists for — a `.DS_Store` synced into
    // one is not.
    expect(ignoredUnder(root, scope([], '.attachments'))(abs('.attachments', 'x.png'))).toBe(false)
    expect(ignoredUnder(root, scope([], 'file-assets'))(abs('file-assets', 'x.png'))).toBe(false)
    for (const junk of ['.DS_Store', 'node_modules', '.git'])
      expect(ignoredUnder(root, scope([], 'file-assets'))(abs('file-assets', junk, 'x'))).toBe(true)
  })

  it('ignoredUnder and classifyEvent agree about what an asset path is', async () => {
    const tree = await refreshTree(root)
    for (const dir of ASSET_ROOTS) {
      const s = scope([], dir)
      const path = abs(...dir.split('/'), 'x.png')
      // A path the watcher drops but the classifier would have handled is silently lost.
      expect(ignoredUnder(root, s)(path)).toBe(false)
      expect(classifyEvent(tree, root, { event: 'change', absPath: path }, s).kind).toBe('asset')
    }
  })

  it('the unreadable list cannot claim an asset path — the arm sits above the check', async () => {
    await writeFile(abs('Notes', '_pagecollection.json'), '{corrupt')
    await refreshTree(root)
    const tree = getLiveTree()
    if (tree === null) throw new Error('no tree')
    expect(tree.unreadable?.map((u) => u.path)).toContain('Notes')
    expect(classifyEvent(tree, root, ev('change', 'Notes', 'x.png'), scope([], 'Notes')).kind).toBe(
      'asset',
    )
  })
})

describe('directory events', () => {
  it('a folder named the way the walk hides one never costs a walk', async () => {
    const tree = await refreshTree(root)
    expect(classifyEvent(tree, root, ev('addDir', '_drafts'), scope()).kind).toBe('ignored')
    expect(classifyEvent(tree, root, ev('addDir', 'Notes', '_scratch'), scope()).kind).toBe(
      'ignored',
    )
    expect(classifyEvent(tree, root, ev('addDir', 'Ideas'), scope()).kind).toBe('full-refresh')
    // A disappearing one still walks — the index owes a prune for whatever it held.
    expect(classifyEvent(tree, root, ev('unlinkDir', '_drafts'), scope()).kind).toBe('full-refresh')
  })
})

describe('touchesCorpus — what owes the index a stat sweep', () => {
  it('names the events that could have moved it, and only those', async () => {
    await refreshTree(root)
    const asks = (e: WatchEvent, excluded: string[] = []): boolean =>
      touchesCorpus(root, [e], scope(excluded))
    expect(asks(ev('addDir', 'Ideas'))).toBe(true)
    expect(asks(ev('unlinkDir', 'Notes'))).toBe(true)
    expect(asks(ev('add', 'Notes', 'B.md'))).toBe(true)
    expect(asks(ev('change', '.nexus', 'properties.json'))).toBe(false)
    expect(asks(ev('change', 'Notes', '_pagecollection.json'))).toBe(false)
    expect(asks(ev('addDir', 'Archive', 'deep'), ['Archive'])).toBe(false)
    // One qualifying event in a batch is enough.
    expect(
      touchesCorpus(root, [ev('change', '.nexus', 'properties.json'), ev('add', 'C.md')], scope()),
    ).toBe(true)
  })
})
