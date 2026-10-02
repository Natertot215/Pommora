import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, open, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import type { Pushes } from '../Contract/bridge'
import type { Changed } from '../Files/writeEcho'
import * as indexSeed from '../Index/indexSeed'
import * as liveTree from './liveTree'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import * as readNexusModule from './readNexus'
import { readNexus } from './readNexus'
import * as adopt from './adopt'
import { atomicWriteFile } from '../Files/atomicWrite'
import { updatePageBody } from './page'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from './identityMark'
import { stabilize } from './treeStabilize'
import { applyEvents, oweCascade, owedFor, oweWalk } from './fileEvents'
import { flush, sent, settleBatch } from './settle'
import type { NexusChange, NexusTree } from './tree'
import { patch } from './treeDelta'
import { closeSession, openSession, whileAdopting } from './session'
import { writeExcludedFolders } from '../Settings/settings'

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'
const ULID_D = '01DX5ZZKBKPCTAV9WEVGEMMVRD'

let root: string
let shown: NexusTree
let pushes: [keyof Pushes, unknown][]
const pusher = {
  push: <K extends keyof Pushes>(channel: K, value: Pushes[K]) => {
    pushes.push([channel, value])
  },
  watch: vi.fn(async () => {}),
}
const abs = (...segs: string[]): string => join(root, ...segs)
const ev = (event: Changed['event'], ...segs: string[]): Changed => ({
  event,
  absPath: abs(...segs),
  origin: 'watched',
})
const backdate = (...segs: string[]): Promise<void> =>
  utimes(abs(...segs), new Date(Date.now() - 1000), new Date(Date.now() - 1000))
const channels = (): string[] => pushes.map(([c]) => c)
const payload = (channel: keyof Pushes): unknown => pushes.find(([c]) => c === channel)?.[1]
const gate = <T>(): { promise: Promise<T>; open: (v: T) => void; fail: (e: Error) => void } => {
  let open!: (v: T) => void
  let fail!: (e: Error) => void
  const promise = new Promise<T>((res, rej) => {
    open = res
    fail = rej
  })
  return { promise, open, fail }
}

beforeEach(async () => {
  root = tempRoot('pom-settle-')
  pushes = []
  await mkdir(abs('.nexus', 'homepage'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'))
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
  await openSession(root)
  shown = sent(await refreshTree(root)).tree
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('what a flush pushes for a batch', () => {
  it('names an outside edit of a page in pages:changed and its container in values:changed', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nedited\n`)
    await applyEvents(root, [ev('change', 'Notes', 'A.md'), ev('change', 'Notes', 'A.md')])
    await flush(pusher, root)
    expect(channels()).toEqual(['pages:changed', 'values:changed'])
    expect(payload('pages:changed')).toEqual(['Notes/A.md'])
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [ULID_A] }])
  })

  it('pushes the tree once when it moved, and a tile host once however often it was named', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await applyEvents(root, [
      ev('add', 'Notes', 'B.md'),
      ev('change', '.nexus', 'homepage', '_tiles.json'),
      ev('change', '.nexus', 'homepage', '_tiles.json'),
    ])
    await flush(pusher, root)
    expect(channels()).toEqual([
      'nexus:changed',
      'pages:changed',
      'values:changed',
      'tiles:changed',
    ])
    expect(patch(shown, (payload('nexus:changed') as NexusChange).delta)).toEqual(heldTreeOf(root))
    expect(payload('tiles:changed')).toEqual({ kind: 'homepage' })
  })

  it('merges a cascade’s pages and hosts with the batch’s, once each', async () => {
    await applyEvents(root, [
      ev('change', 'Notes', 'A.md'),
      ev('change', '.nexus', 'homepage', '_tiles.json'),
    ])
    oweCascade(
      root,
      ['Notes/A.md', 'Other/B.md'],
      [{ kind: 'homepage' }, { kind: 'space', id: 'sp1' }],
    )
    await flush(pusher, root)
    expect(payload('pages:changed')).toEqual(['Notes/A.md', 'Other/B.md'])
    expect(pushes.filter(([c]) => c === 'tiles:changed').map(([, v]) => v)).toEqual([
      { kind: 'homepage' },
      { kind: 'space', id: 'sp1' },
    ])
  })

  it('marks a page whose only writes were its editor’s own saves as body-only', async () => {
    const text = `---\nID: ${ULID_A}\n---\n\nmine\n`
    await writeFile(abs('Notes', 'A.md'), text)
    await applyEvents(root, [
      { ...ev('change', 'Notes', 'A.md'), origin: 'own', text, bodyOnly: true },
    ])
    await flush(pusher, root)
    expect(payload('values:changed')).toEqual([
      { rel: 'Notes', pageIds: [ULID_A], bodyOnly: [ULID_A] },
    ])
  })

  it('groups the value push by container, resolving ids through nested Sets', async () => {
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: ULID_C }))
    await writeFile(abs('Notes', 'Deep', 'D.md'), `---\nID: ${ULID_D}\n---\n\ndelta\n`)
    sent(await refreshTree(root))
    await applyEvents(root, [
      ev('change', 'Notes', 'A.md'),
      ev('change', 'Notes', 'Deep', 'D.md'),
      ev('change', 'Notes', 'A.md'),
    ])
    await flush(pusher, root)
    expect(payload('values:changed')).toEqual([
      { rel: 'Notes', pageIds: [ULID_A] },
      { rel: 'Notes/Deep', pageIds: [ULID_D] },
    ])
  })

  it('a page written outside the editor as well as by it isn’t body-only', async () => {
    const text = `---\nID: ${ULID_A}\n---\n\nmine\n`
    await writeFile(abs('Notes', 'A.md'), text)
    await applyEvents(root, [
      { ...ev('change', 'Notes', 'A.md'), origin: 'own', text, bodyOnly: true },
      { ...ev('change', 'Notes', 'A.md'), origin: 'own', text },
    ])
    await flush(pusher, root)
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [ULID_A] }])
  })

  it('a flush drains what it pushed', async () => {
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    await flush(pusher, root)
    pushes = []
    await flush(pusher, root)
    expect(pushes).toEqual([])
  })

  it('a page the tree doesn’t hold still names its container, with no id', async () => {
    await writeFile(abs('Notes', 'Foreign.md'), '---\nID: 42\n---\n\nforeign\n')
    await applyEvents(root, [ev('add', 'Notes', 'Foreign.md')])
    await flush(pusher, root)
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [] }])
  })

  it('what one root owed is dropped once another root’s event arrives', async () => {
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    owedFor('/elsewhere')
    await flush(pusher, root)
    expect(pushes).toEqual([])
  })

  it('sends the whole tree, under the next version, to a window that holds none of this root', async () => {
    const { version } = sent({ ...shown, nexus: { ...shown.nexus, rootPath: '/elsewhere' } })
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await applyEvents(root, [ev('add', 'Notes', 'B.md')])
    await flush(pusher, root)
    expect(payload('nexus:changed')).toEqual({
      version: version + 1,
      delta: { set: heldTreeOf(root) },
    })
  })

  it('pushes nothing for a batch that changed nothing', async () => {
    await applyEvents(root, [ev('change', '.nexus', 'interface', 'sidepane.json')])
    await flush(pusher, root)
    expect(pushes).toEqual([])
  })

  it('owes the walk for an event that arrives with no live tree', async () => {
    dropLiveTree()
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    expect(owedFor(root).walk).toBe(true)
  })
})

describe('the settle', () => {
  it('an event whose arm resumes after a concurrent flush has pushed still owes its walk to the next flush', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    const reached = gate<void>()
    const read = gate<never>()
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementationOnce(() => {
      reached.open()
      return read.promise
    })
    const applying = applyEvents(root, [ev('add', 'Notes', 'B.md')])
    await reached.promise
    oweCascade(root, ['Notes/A.md'], [])
    await flush(pusher, root)
    expect(channels()).toEqual(['pages:changed'])
    const walk = vi.spyOn(liveTree, 'refreshAfterWrite')
    read.fail(new Error('mid-read'))
    await applying
    expect(owedFor(root).walk).toBe(true)
    await flush(pusher, root)
    expect(walk).toHaveBeenCalledTimes(1)
    expect(heldTreeOf(root)?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
  })

  it('a page a walk lists missing is stamped once still, and a fresh one is left for its own event', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await backdate('Notes', 'Bare.md')
    await writeFile(abs('Notes', 'Fresh.md'), 'fresh\n')
    await settleBatch(pusher, root, [ev('change', '.nexus', 'nexus.json')])
    expect(heldTreeOf(root)?.unreadable).toEqual([
      { path: 'Notes/Fresh.md', kind: 'page', reason: 'missing' },
    ])
    expect(await readFile(abs('Notes', 'Fresh.md'), 'utf8')).toBe('fresh\n')
    const bare = heldTreeOf(root)?.collections[0]?.pages.find((p) => p.path === 'Notes/Bare.md')
    expect(bare?.id).toBe(splitFrontmatter(await readFile(abs('Notes', 'Bare.md'), 'utf8'))[ID_KEY])
  })

  it('a Space a walk lists missing its ID holds the pages tagged with it once its stamp lands', async () => {
    await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
    await writeFile(
      abs('.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
    )
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n<Areas>:\n  - Home\n---\n\nbeta\n`)
    oweWalk(root)
    await flush(pusher, root)
    await writeFile(abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'), '{}')
    oweWalk(root)
    await flush(pusher, root)
    const held = heldTreeOf(root)
    const home = held?.contexts[0]?.spaces[0]
    expect(held?.collections[0]?.pages.find((p) => p.id === ULID_B)?.contextValues).toEqual({
      ctx1: [home?.id],
    })
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it.each([
    ['a Set with a sidecar', ['Notes', 'Fresh'], true],
    ['a Set without one', ['Notes', 'Fresh'], false],
    ['a root folder', ['Fresh'], false],
  ] as const)('a note still being written into a folder that just appeared keeps every byte, and is stamped by its own event once still (%s)', async (_, dir, sidecar) => {
    await mkdir(abs(...dir))
    if (sidecar) await writeFile(abs(...dir, '_pageset.json'), JSON.stringify({ id: ULID_C }))
    const writer = await open(abs(...dir, 'Note.md'), 'w')
    await writer.write('first half\n')
    await settleBatch(pusher, root, [ev('addDir', ...dir)])
    await writer.write('second half\n')
    await writer.close()
    await settleBatch(pusher, root, [ev('add', ...dir, 'Note.md')])
    const text = await readFile(abs(...dir, 'Note.md'), 'utf8')
    expect(text).toContain('first half\nsecond half\n')
    const held = heldTreeOf(root)
    const pages = held?.collections.flatMap((c) => [...c.pages, ...c.sets.flatMap((s) => s.pages)])
    expect(pages?.find((p) => p.path === [...dir, 'Note.md'].join('/'))?.id).toBe(
      splitFrontmatter(text)[ID_KEY],
    )
    expect(held?.unreadable).toBeUndefined()
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a folder that appears with a fresh ID-less note doesn’t list it', async () => {
    await mkdir(abs('Notes', 'Fresh'))
    await writeFile(abs('Notes', 'Fresh', '_pageset.json'), JSON.stringify({ id: ULID_C }))
    await writeFile(abs('Notes', 'Fresh', 'Note.md'), 'note\n')
    await applyEvents(root, [ev('addDir', 'Notes', 'Fresh')])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(owedFor(root).stamp).toEqual([])
    await flush(pusher, root)
    expect(await readFile(abs('Notes', 'Fresh', 'Note.md'), 'utf8')).toBe('note\n')
  })

  it('un-excluding a folder that was adopted before holds the notes added while it was excluded', async () => {
    await mkdir(abs('Archive'))
    await writeFile(abs('Archive', '_pagecollection.json'), JSON.stringify({ id: ULID_C }))
    sent(await refreshTree(root))
    await writeExcludedFolders(root, ['Archive'])
    await flush(pusher, root)
    await writeFile(abs('Archive', 'New.md'), 'new\n')
    await backdate('Archive', 'New.md')
    await writeExcludedFolders(root, [])
    await flush(pusher, root)
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    const archive = held?.collections.find((c) => c.path === 'Archive')
    expect(archive?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('Archive', 'New.md'), 'utf8'))[ID_KEY],
    ])
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('an editor save during a walk doesn’t restart it, and the walk installs what a fresh read answers', async () => {
    const reading = gate<void>()
    const release = gate<void>()
    const walk = readNexusModule.readNexus
    const reads = vi.spyOn(readNexusModule, 'readNexus').mockImplementation(async (r) => {
      const walked = await walk(r)
      reading.open()
      await release.promise
      return walked
    })
    const walking = refreshTree(root)
    await reading.promise
    for (let i = 0; i < 5; i++)
      await updatePageBody(abs('Notes', 'A.md'), `edit ${i}\n`, undefined, true)
    release.open()
    await walking
    expect(reads).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
    const held = heldTreeOf(root)
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('un-excluding folders of ID-less notes stamps and holds them, and re-arms the watch once', async () => {
    await mkdir(abs('Archive', 'Old'), { recursive: true })
    await writeFile(abs('Archive', 'X.md'), 'x\n')
    await writeFile(abs('Archive', 'Old', 'Y.md'), 'y\n')
    await mkdir(abs('Notes', 'Sub'))
    await writeFile(abs('Notes', 'Sub', 'Z.md'), 'z\n')
    await backdate('Archive', 'X.md')
    await backdate('Archive', 'Old', 'Y.md')
    await backdate('Notes', 'Sub', 'Z.md')
    await writeExcludedFolders(root, ['Archive', 'Notes/Sub'])
    await flush(pusher, root)
    pusher.watch.mockClear()
    await writeExcludedFolders(root, [])
    await flush(pusher, root)
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    const paths = held?.collections.flatMap((c) => [
      ...c.pages.map((p) => p.path),
      ...(c.sets ?? []).flatMap((s) => s.pages.map((p) => p.path)),
    ])
    expect(paths).toEqual(
      expect.arrayContaining(['Archive/X.md', 'Archive/Old/Y.md', 'Notes/Sub/Z.md']),
    )
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
    expect(pusher.watch).toHaveBeenCalledTimes(1)
  })

  it('a flush while an open is under way pushes nothing, and the next one pushes what was owed', async () => {
    oweCascade(root, ['Notes/A.md'], [])
    await whileAdopting(() => flush(pusher, root))
    expect(pushes).toEqual([])
    await flush(pusher, root)
    expect(pushes).toEqual([['pages:changed', ['Notes/A.md']]])
  })

  it('a flush that owes a reseed doesn’t delay a second flush behind it', async () => {
    const seeding = gate<indexSeed.SeedReread>()
    const seed = vi.spyOn(indexSeed, 'seedContentIndex').mockImplementation(() => seeding.promise)
    owedFor(root).corpus = true
    let firstDone = false
    const first = flush(pusher, root).then(() => {
      firstDone = true
    })
    await flush(pusher, root)
    expect(seed).toHaveBeenCalledTimes(1)
    expect(firstDone).toBe(false)
    seeding.open({ db: null, rels: [] })
    await first
    expect(firstDone).toBe(true)
  })
})

describe('an outside batch’s turn', () => {
  const ULID_N = '01NX5ZZKBKPCTAV9WEVGEMMVRN'
  const bytes = (...segs: string[]): Promise<string> => readFile(abs(...segs), 'utf8')
  // An editor write and its gate's flush, answered by whether the flush returned before a wait no stamp of the batch's could fit in.
  const reply = async (): Promise<'replied' | 'waited'> => {
    await atomicWriteFile(abs('Notes', 'New.md'), `---\nID: ${ULID_N}\n---\n\nnew\n`)
    return Promise.race([
      flush(pusher, root).then(() => 'replied' as const),
      new Promise<'waited'>((r) => setTimeout(() => r('waited'), 200)),
    ])
  }
  // What the window holds once it applies every tree it was pushed.
  const windowTree = (): NexusTree =>
    pushes
      .filter(([c]) => c === 'nexus:changed')
      .reduce((t, [, v]) => patch(t, (v as NexusChange).delta), shown)
  const agrees = async (): Promise<void> => {
    const live = heldTreeOf(root)
    expect(live && stabilize(await readNexus(root), live)).toBe(live)
  }
  const held = (rel: string): string | undefined =>
    heldTreeOf(root)?.collections[0]?.pages.find((p) => p.path === rel)?.id

  it('a reply’s flush doesn’t wait on the stamps of a batch that has applied', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const stamping = gate<void>()
    const release = gate<void>()
    const stampMissing = adopt.stampMissing
    vi.spyOn(adopt, 'stampMissing').mockImplementationOnce(async (...args) => {
      stamping.open()
      await release.promise
      return stampMissing(...args)
    })
    const batch = settleBatch(pusher, root, [ev('add', 'Notes', 'Bare.md')])
    await stamping.promise
    expect(await reply()).toBe('replied')
    expect(held('Notes/New.md')).toBe(ULID_N)
    release.open()
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    await agrees()
  })

  it('a reply while a batch applies stamps nothing the batch listed, and the window isn’t shown it as unreadable', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await writeFile(abs('Notes', 'Late.md'), 'late\n')
    const reached = gate<void>()
    const release = gate<void>()
    const read = readNexusModule.readPageRecord
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
      if (rel === 'Notes/Late.md') {
        reached.open()
        await release.promise
      }
      return read(file, rel)
    })
    const batch = settleBatch(pusher, root, [
      ev('add', 'Notes', 'Bare.md'),
      ev('add', 'Notes', 'Late.md'),
    ])
    await reached.promise
    expect(await reply()).toBe('replied')
    expect(await bytes('Notes', 'Bare.md')).toBe('bare\n')
    expect(windowTree().unreadable).toBeUndefined()
    release.open()
    await batch
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(windowTree()).toEqual(heldTreeOf(root))
    await agrees()
  })

  it('a walk that read a file before the batch stamped it walks again, and holds the stamp', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const stamping = gate<void>()
    const release = gate<void>()
    const stamped = gate<void>()
    const stampMissing = adopt.stampMissing
    vi.spyOn(adopt, 'stampMissing').mockImplementationOnce(async (...args) => {
      stamping.open()
      await release.promise
      const landed = await stampMissing(...args)
      stamped.open()
      return landed
    })
    const walking = gate<void>()
    const walkRelease = gate<void>()
    const walk = readNexusModule.readNexus
    vi.spyOn(readNexusModule, 'readNexus').mockImplementationOnce(async (at) => {
      const tree = await walk(at)
      walking.open()
      await walkRelease.promise
      return tree
    })
    const batch = settleBatch(pusher, root, [ev('add', 'Notes', 'Bare.md')])
    await stamping.promise
    await applyEvents(root, [ev('change', '.nexus', 'nexus.json')])
    const replied = flush(pusher, root)
    await walking.promise
    release.open()
    await stamped.promise
    walkRelease.open()
    await replied
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(windowTree()).toEqual(heldTreeOf(root))
    await agrees()
  })

  it('a stamp never lands on a file while the batch that listed it is still reading it', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const reached = gate<void>()
    const release = gate<void>()
    const read = readNexusModule.readPageRecord
    let reads = 0
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
      const record = await read(file, rel)
      if (++reads === 2) {
        reached.open()
        await release.promise
      }
      return record
    })
    const batch = settleBatch(pusher, root, [
      ev('add', 'Notes', 'Bare.md'),
      ev('change', 'Notes', 'Bare.md'),
    ])
    await reached.promise
    await reply()
    expect(await bytes('Notes', 'Bare.md')).toBe('bare\n')
    release.open()
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    await agrees()
  })
})
