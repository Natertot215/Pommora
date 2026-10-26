import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { settledMutate } from '../Testing/settledMutate'
import { jsonText, pathExists } from '../Files/atomicWrite'
import type { ChangeEvent, FileEvent } from '../Files/writeEcho'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { diskMoved, dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { settleBatch, settleNow } from '../Nexus/settle'
import type { MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
import * as bundles from '../Bundles/bundle'
import { listBundles } from '../Bundles/bundle'
import type { BundleStore } from '../Bundles/layout'
import { readRecord } from '../Bundles/record'
import type { TrashDeps } from '../Trash/discard'
import { settleArchives } from './refile'

const NOTES = '01KVGMT8BFP350FZZXAMG1QDN0'
const OTHER = '01KVGMT8BFP350FZZXAMG1QDR0'
const DAILY = '01KVGMT8BFP350FZZXAMG1QDD0'
const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
const DEEP = '01KVGMT8BFP350FZZXAMG1QDE0'
const PAGE_N = '01KVGMT8BFP350FZZXAMG1QDVN'
const PAGE_K = '01KVGMT8BFP350FZZXAMG1QDVK'
const PAGE_W = '01KVGMT8BFP350FZZXAMG1QDVW'
const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
const GONE = '01KVGMT8BFP350FZZXAMG1QDG0'
const GONE_SET = '01KVGMT8BFP350FZZXAMG1QDG1'
const STAMP = '2026-10-20T00-00-00-000Z'
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
const QUIET = { push: () => {}, watch: async () => {} }
const IN_NOTES: BundleStore = { kind: 'archive', id: NOTES }
const IN_OTHER: BundleStore = { kind: 'archive', id: OTHER }
const INTO_OTHER: RestoreDestination = { kind: 'container', id: OTHER }

let root: string
const at = (...segs: string[]): string => join(root, ...segs)
const mutate = (req: Parameters<typeof settledMutate>[1]): Promise<MutateReply> =>
  settledMutate(root, req, nexusDeps)
const bundled = async (req: Parameters<typeof settledMutate>[1]): Promise<string> => {
  const r = await mutate(req)
  expect(r.ok).toBe(true)
  return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
}
const archive = (path: string, kind: 'page' | 'set' = 'page'): Promise<string> =>
  bundled({ op: 'archive', path, kind })
const leafOf = (bundlePath: string): string => bundlePath.split('/').at(-1) ?? ''
const filed = async (store: BundleStore) =>
  (await listBundles(root, store)).map(({ bundlePath, record }) => ({
    bundlePath,
    id: 'id' in record ? record.id : undefined,
    trail: 'trail' in record ? record.trail : undefined,
  }))
const reread = () => {
  diskMoved()
  return refreshTree(root)
}
const seedArchived = async (record: unknown, chain = 'Gone'): Promise<string> => {
  const bundle = `.nexus/archive/${GONE}/${chain}/${STAMP}__Orphan.md.archived`
  await mkdir(at(bundle), { recursive: true })
  await writeFile(at(bundle, 'Orphan.md'), `---\nID: ${PAGE_G}\n---\norphan\n`)
  await writeFile(at(bundle, '_record.json'), jsonText(record))
  return bundle
}
const ORPHAN = { entity: 'page', id: PAGE_G, parent: { kind: 'container', id: GONE_SET } }
const ev = (event: ChangeEvent, ...segs: string[]): FileEvent => ({
  event,
  absPath: at(...segs),
  origin: 'watched',
})

beforeEach(async () => {
  root = tempRoot('pom-refile-')
  installStores(memoryStores().stores)
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(at('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  await mkdir(at('Notes', 'Daily', 'Sub', 'Deep'), { recursive: true })
  await mkdir(at('Other'))
  await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: NOTES }))
  await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: OTHER }))
  await writeFile(at('Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: DAILY }))
  await writeFile(at('Notes', 'Daily', 'Sub', '_pageset.json'), JSON.stringify({ id: SUB }))
  await writeFile(
    at('Notes', 'Daily', 'Sub', 'Deep', '_pageset.json'),
    JSON.stringify({ id: DEEP }),
  )
  await writeFile(at('Notes', 'Daily', 'Sub', 'Note.md'), `---\nID: ${PAGE_N}\n---\nnote\n`)
  await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${PAGE_K}\n---\nkept\n`)
  await writeFile(at('Notes', 'Daily', 'Sub', 'Deep', 'Low.md'), `---\nID: ${PAGE_W}\n---\nlow\n`)
  await openSession(root)
  await refreshTree(root)
  await seedContentIndex(root)
  await settleNow(QUIET, root)
})

afterEach(async () => {
  vi.restoreAllMocks()
  dropLiveTree()
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('the comparison — a Set the settle sees move carries what was archived from within it', () => {
  it('a Set moved into another Collection carries what was archived from within it', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    expect(await pathExists(at(bundlePath))).toBe(false)
    const carried = `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`
    expect(await filed(IN_OTHER)).toEqual([{ bundlePath: carried, id: PAGE_N, trail: [OTHER] }])
    expect(await filed(IN_NOTES)).toEqual([])
    expect(await readFile(at(carried, 'Note.md'), 'utf8')).toBe(`---\nID: ${PAGE_N}\n---\nnote\n`)
    const record = await readRecord(at(carried))
    expect(record && 'parent' in record && record.parent).toEqual({ kind: 'container', id: SUB })
  })

  it('a Collection whose id would not make a folder name takes nothing outside the Archive', async () => {
    await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: '../../Escape' }))
    await reread()
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    await settleArchives(root, await reread())
    expect(await pathExists(at('Escape'))).toBe(false)
    expect((await filed(IN_NOTES)).map((b) => b.bundlePath)).toEqual([bundlePath])
  })

  it('a Collection whose id would not make a folder name reaches no sidecar outside the Archive', async () => {
    const INNER = '01KVGMT8BFP350FZZXAMG1QDJ0'
    await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: '../../Escape' }))
    await mkdir(at('Other', 'A', 'Inner'), { recursive: true })
    await mkdir(at('Other', 'B'))
    await writeFile(at('Other', 'A', '_pageset.json'), JSON.stringify({ id: GONE }))
    await writeFile(at('Other', 'B', '_pageset.json'), JSON.stringify({ id: GONE_SET }))
    await writeFile(at('Other', 'A', 'Inner', '_pageset.json'), JSON.stringify({ id: INNER }))
    const outside = JSON.stringify({
      id: DEEP,
      views: [
        {
          id: 'view_1',
          name: 'V',
          type: 'table',
          filter: {
            match: 'all',
            rules: [{ property_id: '_location', op: 'is', values: [INNER] }],
          },
        },
      ],
    })
    await mkdir(at('Escape', 'X'), { recursive: true })
    await writeFile(at('Escape', 'X', '_pageset.json'), outside)
    await reread()
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Other/A/Inner',
          newParentPath: 'Other/B',
          order: [INNER],
        })
      ).ok,
    ).toBe(true)
    expect(await readFile(at('Escape', 'X', '_pageset.json'), 'utf8')).toBe(outside)
  })

  it('a Set moved out of its Collection takes the archived Sets within it from the views it left', async () => {
    const filter = (values: string[]) => ({
      match: 'all',
      rules: [{ property_id: '_location', op: 'is', values }],
    })
    await writeFile(
      at('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: NOTES,
        views: [{ id: 'view_1', name: 'V', type: 'table', filter: filter([DEEP, 'set_keep']) }],
      }),
    )
    await reread()
    await archive('Notes/Daily/Sub/Deep', 'set')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    const { views } = JSON.parse(await readFile(at('Notes', '_pagecollection.json'), 'utf8'))
    expect(views[0].filter).toEqual(filter(['set_keep']))
  })

  it('a Set moved out of its Collection takes the archived Sets within it from the views it left after a Set above it was renamed', async () => {
    const filter = (values: string[]) => ({
      match: 'all',
      rules: [{ property_id: '_location', op: 'is', values }],
    })
    await writeFile(
      at('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: NOTES,
        views: [{ id: 'view_1', name: 'V', type: 'table', filter: filter([DEEP, 'set_keep']) }],
      }),
    )
    await reread()
    await archive('Notes/Daily/Sub/Deep', 'set')
    expect(
      (await mutate({ op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Days' })).ok,
    ).toBe(true)
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Days/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    const { views } = JSON.parse(await readFile(at('Notes', '_pagecollection.json'), 'utf8'))
    expect(views[0].filter).toEqual(filter(['set_keep']))
  })

  it('an archived Set carried with a Set that changes Collection keeps its own saved views', async () => {
    const own = JSON.stringify({
      id: DEEP,
      views: [
        {
          id: 'view_1',
          name: 'V',
          type: 'table',
          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [DEEP] }] },
        },
      ],
    })
    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep', '_pageset.json'), own)
    await reread()
    const deep = await archive('Notes/Daily/Sub/Deep', 'set')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    const carried = `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(deep)}`
    expect(JSON.parse(await readFile(at(carried, 'Deep', '_pageset.json'), 'utf8'))).toEqual(
      JSON.parse(own),
    )
  })

  it('a Set moved within its Collection rewrites the trails alone', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Notes',
          order: [DAILY, SUB],
        })
      ).ok,
    ).toBe(true)
    expect(await filed(IN_NOTES)).toEqual([{ bundlePath, id: PAGE_N, trail: [NOTES] }])
  })

  it('a record whose origin was itself archived is placed by the trail it stored', async () => {
    const low = await archive('Notes/Daily/Sub/Deep/Low.md')
    const deep = await archive('Notes/Daily/Sub/Deep', 'set')
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Other',
          order: [SUB],
        })
      ).ok,
    ).toBe(true)
    const into = `.nexus/archive/${OTHER}/Notes/Daily/Sub`
    expect(
      (await filed(IN_OTHER)).sort((a, b) => a.bundlePath.localeCompare(b.bundlePath)),
    ).toEqual(
      [
        { bundlePath: `${into}/Deep/${leafOf(low)}`, id: PAGE_W, trail: [OTHER, SUB] },
        { bundlePath: `${into}/${leafOf(deep)}`, id: DEEP, trail: [OTHER] },
      ].sort((a, b) => a.bundlePath.localeCompare(b.bundlePath)),
    )
    expect(await filed(IN_NOTES)).toEqual([])
  })

  it('a Set moved in Finder is carried once the settle sees it', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
    await settleBatch(QUIET, root, [
      ev('unlinkDir', 'Notes', 'Daily', 'Sub'),
      ev('addDir', 'Other', 'Sub'),
    ])
    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it('a Set moved in Finder into a Collection renamed in the same settle is carried', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
    await rename(at('Other'), at('Elsewhere'))
    await settleBatch(QUIET, root, [
      ev('unlinkDir', 'Notes', 'Daily', 'Sub'),
      ev('unlinkDir', 'Other'),
      ev('addDir', 'Elsewhere'),
    ])
    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it('a rename moves nothing and reads no Archive', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    const listed = vi.spyOn(bundles, 'archivedWithin')
    expect(
      (await mutate({ op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Days' })).ok,
    ).toBe(true)
    expect(listed).not.toHaveBeenCalled()
    expect((await readRecord(at(bundlePath)))?.entity).toBe('page')
  })
})

describe('the restore — a Set landing in another Collection carries what was archived from within it', () => {
  it('a Set restored from the Trash into another Collection carries what was archived from within it before it left', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    const trashed = await bundled({ op: 'delete', path: 'Notes/Daily/Sub', kind: 'set' })
    expect((await mutate({ op: 'restore', bundlePath: trashed, destination: INTO_OTHER })).ok).toBe(
      true,
    )
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it('a Set that sat directly in its Collection, restored from the Trash to a destination in another Collection, carries what was archived from within it', async () => {
    expect(
      (
        await mutate({
          op: 'moveSet',
          path: 'Notes/Daily/Sub',
          newParentPath: 'Notes',
          order: [DAILY, SUB],
        })
      ).ok,
    ).toBe(true)
    const bundlePath = await archive('Notes/Sub/Note.md')
    const trashed = await bundled({ op: 'delete', path: 'Notes/Sub', kind: 'set' })
    const stored = await readRecord(at(trashed))
    expect(stored && 'trail' in stored ? stored.trail : undefined).toEqual([])
    expect((await mutate({ op: 'restore', bundlePath: trashed, destination: INTO_OTHER })).ok).toBe(
      true,
    )
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it('an archived Set restored to a destination in another Collection does the same', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    const sub = await archive('Notes/Daily/Sub', 'set')
    expect((await mutate({ op: 'restore', bundlePath: sub, destination: INTO_OTHER })).ok).toBe(
      true,
    )
    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it.each([
    ['the Trash', 'delete'],
    ['the Archive', 'archive'],
  ] as const)('a carry that throws leaves a restored Set restored, from %s', async (_, op) => {
    await archive('Notes/Daily/Sub/Note.md')
    const stored = await bundled({ op, path: 'Notes/Daily/Sub', kind: 'set' })
    vi.spyOn(bundles, 'archivedWithin').mockRejectedValue(new Error('unreadable'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await mutate({ op: 'restore', bundlePath: stored, destination: INTO_OTHER })).ok).toBe(
      true,
    )
    expect(await readdir(at('Other', 'Sub'))).toContain('Kept.md')
    expect(await pathExists(at(stored))).toBe(false)
    expect(logged).toHaveBeenCalledWith('archive: the carry failed:', 'unreadable')
  })
})

describe('the open pass — an orphaned Archive moves into the Trash, and a live one re-files', () => {
  it('an Archive whose id names nothing anywhere moves into the Trash with each record whole', async () => {
    const bundlePath = await seedArchived(ORPHAN)
    const stored = await readFile(at(bundlePath, '_record.json'), 'utf8')
    await settleArchives(root, await reread())
    const [leaf, ...more] = await readdir(at('.trash', 'Gone'))
    expect(more).toEqual([])
    expect(leaf).toMatch(/__Orphan\.md\.deleted$/)
    expect(leaf?.startsWith(STAMP)).toBe(false)
    const swept = at('.trash', 'Gone', leaf ?? '')
    expect(await readFile(join(swept, '_record.json'), 'utf8')).toBe(stored)
    expect(await readRecord(swept)).not.toHaveProperty('archive')
    expect(await readFile(join(swept, 'Orphan.md'), 'utf8')).toBe(
      `---\nID: ${PAGE_G}\n---\norphan\n`,
    )
    expect(await pathExists(at('.nexus', 'archive', GONE))).toBe(false)
  })

  it('an Archive whose Collection sits in an excluded root folder is kept', async () => {
    await mkdir(at('Private'))
    await writeFile(at('Private', '_pagecollection.json'), JSON.stringify({ id: GONE }))
    await writeFile(
      at('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Private'] }),
    )
    const bundlePath = await seedArchived(ORPHAN, 'Private')
    const tree = await reread()
    expect(tree.collections.some((c) => c.id === GONE)).toBe(false)
    await settleArchives(root, tree)
    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
    expect(await pathExists(at('.trash'))).toBe(false)
  })

  it('an Archive whose Collection folder was renamed hidden is kept', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    await rename(at('Notes'), at('_Notes'))
    await settleArchives(root, await reread())
    expect(await pathExists(at(bundlePath, 'Note.md'))).toBe(true)
    expect(await pathExists(at('.trash'))).toBe(false)
  })

  it('an Archive whose Collection sits in the Trash is kept', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    await bundled({ op: 'delete', path: 'Notes', kind: 'collection' })
    await settleArchives(root, await reread())
    expect((await filed(IN_NOTES)).map((b) => b.bundlePath)).toEqual([bundlePath])
  })

  it('no Archive is taken for orphaned while a root folder’s sidecar reads unreadable', async () => {
    await mkdir(at('Broken'))
    await writeFile(at('Broken', '_pagecollection.json'), '{ not json')
    const bundlePath = await seedArchived(ORPHAN)
    const tree = await reread()
    expect(tree.unreadable?.some((u) => u.kind === 'collection')).toBe(true)
    await settleArchives(root, tree)
    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
  })

  it('a bundle that won’t parse stays as evidence, and its folder with it', async () => {
    const bundlePath = await seedArchived(ORPHAN)
    await writeFile(at(bundlePath, '_record.json'), '{ not json')
    await settleArchives(root, await reread())
    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
    expect(await pathExists(at('.trash', 'Gone'))).toBe(false)
  })

  it('a record whose origin now sits in another Collection is carried there under its own name, its trail rewritten', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
    await settleArchives(root, await reread())
    expect(await pathExists(at(bundlePath))).toBe(false)
    expect(await filed(IN_OTHER)).toEqual([
      {
        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
        id: PAGE_N,
        trail: [OTHER],
      },
    ])
  })

  it('a record whose origin the tree no longer holds stays', async () => {
    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
    const stored = await readFile(at(bundlePath, '_record.json'), 'utf8')
    await rm(at('Notes', 'Daily', 'Sub'), { recursive: true })
    await settleArchives(root, await reread())
    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(stored)
    expect(await filed(IN_OTHER)).toEqual([])
  })
})
