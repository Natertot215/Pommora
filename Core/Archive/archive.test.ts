import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { basename, join } from '../Paths/posix'
import {
  bytesUnder,
  putJson,
  readJsonAt,
  refuseWrites,
  seedNexus,
  tempRoot,
} from '../Testing/hostFs'
import { settledMutate } from '../Testing/settledMutate'
import * as atomicWrite from '../Files/atomicWrite'
import * as record from '../Bundles/record'
import * as settings from '../Settings/settings'
import { fail } from '../Contract/result'
import { pathExists } from '../Files/atomicWrite'
import { splitFrontmatter } from '../Files/pageFile'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { machine } from '../Platform/machine'
import { dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { readShard, updatePageMetadata } from '../Nexus/pageMetadata'
import { shardOf } from '../Nexus/ids'
import { settleNow } from '../Nexus/settle'
import { readNexus } from '../Nexus/readNexus'
import { nexusPages } from '../Nexus/heldPages'
import { minted, type MutateReply, type RestoreDestination } from '../Nexus/mutateRequest'
import { writeExcludedFolders } from '../Settings/settings'
import { readNotes } from '../Nexus/owed'
import { listBundles, mintBundle } from '../Bundles/bundle'
import type { BundleStore } from '../Bundles/layout'
import { readRawRecord, readRecord, writeRecord } from '../Bundles/record'
import { bundleRows } from '../Bundles/rows'
import { NO_DESTINATION } from '../Bundles/placement'
import type { TrashDeps } from '../Trash/discard'

const NOTES = '01KVGMT8BFP350FZZXAMG1QDN0'
const DAILY = '01KVGMT8BFP350FZZXAMG1QDD0'
const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
const PAGE_K = '01KVGMT8BFP350FZZXAMG1QDVK'
const OTHER = '01KVGMT8BFP350FZZXAMG1QDO0'
const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
const PAGE_D = '01KVGMT8BFP350FZZXAMG1QDVD'
const DEEP = `---\nID: ${PAGE_D}\n---\ndeep\n`
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
const ARCHIVE: BundleStore = { kind: 'archive', id: NOTES }
const BETA = `---\nID: ${PAGE_B}\n---\nbeta\n`

let root: string
const at = (...segs: string[]): string => join(root, ...segs)
const text = (...segs: string[]): Promise<string> => readFile(at(...segs), 'utf8')
const pageOrder = async (): Promise<unknown> =>
  (await readJsonAt<{ page_order?: string[] }>(at('Notes', 'Daily', '_pageset.json'))).page_order
const reseed = async (): Promise<void> => {
  await refreshTree(root)
  await seedContentIndex(root)
}
const mutate = (req: Parameters<typeof settledMutate>[1]): Promise<MutateReply> =>
  settledMutate(root, req, nexusDeps)
const message = (r: MutateReply): string => (r.ok ? '' : r.error.message)
const archive = async (path: string, kind: 'page' | 'set' = 'page'): Promise<string> => {
  const r = await mutate({ op: 'archive', path, kind })
  expect(r.ok).toBe(true)
  return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
}
const restore = (bundlePath: string, destination?: RestoreDestination): Promise<MutateReply> =>
  mutate({ op: 'restore', bundlePath, ...(destination ? { destination } : {}) })
const INTO_NOTES: RestoreDestination = { kind: 'container', id: NOTES }
const undo = (r: MutateReply): Promise<MutateReply> => {
  if (!r.ok || !r.value.undo) throw new Error('The reply carries no Undo.')
  return mutate(r.value.undo)
}

beforeEach(async () => {
  root = tempRoot('pom-archive-')
  installStores(memoryStores().stores)
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(at('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  await seedNexus(root, {
    defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
  })
  await mkdir(at('Notes', 'Daily'), { recursive: true })
  await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: NOTES }))
  await writeFile(
    at('Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: DAILY, page_order: [PAGE_A, PAGE_B, PAGE_G] }),
  )
  await writeFile(at('Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_A}\n---\nalpha\n`)
  await writeFile(at('Notes', 'Daily', 'Beta.md'), BETA)
  await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\ngamma\n`)
  await writeFile(at('Notes', 'Linker.md'), `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Beta]]`)
  await openSession(root)
  await reseed()
})

afterEach(async () => {
  vi.restoreAllMocks()
  dropLiveTree()
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('archive — a page or Set leaves for its Collection’s Archive', () => {
  it('a page archives into its Collection’s Archive under the chain it left, with its record', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    expect(bundlePath).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
    )
    expect(await readFile(at(bundlePath, 'Beta.md'), 'utf8')).toBe(BETA)
    expect(await readRecord(at(bundlePath))).toEqual({
      entity: 'page',
      id: PAGE_B,
      parent: { kind: 'container', id: DAILY },
      place: { above: PAGE_G, below: PAGE_A },
      trail: [NOTES],
    })
    const daily = heldTreeOf(root)?.collections[0].sets[0]
    expect(daily?.pages.map((p) => p.title)).toEqual(['Alpha', 'Gamma'])
    expect(await pageOrder()).toEqual([PAGE_A, PAGE_G])
  })

  it('an archived page stays in every cascade’s reach', async () => {
    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\n[[Alpha]]`)
    await reseed()
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const renamed = await mutate({
      op: 'rename',
      path: 'Notes/Daily/Alpha.md',
      kind: 'page',
      newName: 'Alpha 2',
    })
    expect(renamed.ok).toBe(true)
    expect(await text(bundlePath, 'Beta.md')).toBe(`---\nID: ${PAGE_B}\n---\n[[Alpha 2]]`)
  })

  it('a rename’s cascade through an archived linker reports no archived path', async () => {
    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\n[[Alpha]]`)
    await reseed()
    await archive('Notes/Daily/Beta.md')
    const renamed = await mutate({
      op: 'rename',
      path: 'Notes/Daily/Alpha.md',
      kind: 'page',
      newName: 'Alpha 2',
    })
    expect(renamed.ok && renamed.value.cascade?.pages).toEqual([])
  })

  it('a Set archives once the excluded folder inside it is lifted to its parent', async () => {
    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
    await writeFile(
      at('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
    )
    await refreshTree(root)
    const bundlePath = await archive('Notes/Daily', 'set')
    expect(await text('Notes', 'Private', 'Secret.md')).toBe('secret\n')
    expect(
      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
        .excluded_folders,
    ).toEqual(['Notes/Private'])
    expect(await readdir(at(bundlePath))).toContain('Daily')
    expect(await readdir(at(bundlePath, 'Daily'))).not.toContain('Private')
  })

  it('a Set archive whose move fails puts the lifted folder and its entry back', async () => {
    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
    await writeFile(
      at('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
    )
    await refreshTree(root)
    const relocate = atomicWrite.relocate
    vi.spyOn(atomicWrite, 'relocate')
      .mockImplementationOnce(relocate)
      .mockRejectedValueOnce(new Error('the move failed'))
    expect((await mutate({ op: 'archive', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
    expect(
      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
        .excluded_folders,
    ).toEqual(['Notes/Daily/Private'])
  })

  it('a lift refused on its second folder puts the first back', async () => {
    for (const name of ['Private', 'Raw'])
      await mkdir(at('Notes', 'Daily', name), { recursive: true })
    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
    await writeFile(
      at('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Notes/Daily/Private', 'Notes/Daily/Raw'] }),
    )
    await refreshTree(root)
    const carry = settings.carrySetAside
    vi.spyOn(settings, 'carrySetAside')
      .mockImplementationOnce(carry)
      .mockResolvedValueOnce(fail('operation-failed', 'the carry failed'))
    expect((await mutate({ op: 'archive', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
    expect(
      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
        .excluded_folders,
    ).toEqual(['Notes/Daily/Private', 'Notes/Daily/Raw'])
  })

  it('a Set delete whose record write throws puts the lifted folder back', async () => {
    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
    await writeFile(
      at('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
    )
    await refreshTree(root)
    vi.spyOn(record, 'writeRecord').mockRejectedValueOnce(new Error('the write failed'))
    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
    expect(
      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
        .excluded_folders,
    ).toEqual(['Notes/Daily/Private'])
  })

  it('an archive handed the bundle address its item left takes its name back, and one naming another name or a path outside the store takes a fresh stamp', async () => {
    const rearchive = async (path: string, at: string): Promise<string> => {
      const r = await mutate({ op: 'archive', path, kind: 'page', at })
      expect(r.ok).toBe(true)
      return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
    }
    const first = await archive('Notes/Daily/Beta.md')
    expect((await restore(first)).ok).toBe(true)
    expect(await rearchive('Notes/Daily/Beta.md', first)).toBe(first)
    expect((await restore(first)).ok).toBe(true)
    const renamed = await mutate({
      op: 'rename',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
      newName: 'Beta 2',
    })
    expect(renamed.ok).toBe(true)
    const second = await rearchive('Notes/Daily/Beta 2.md', first)
    expect(second).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta 2\\.md\\.archived$`),
    )
    expect((await restore(second)).ok).toBe(true)
    const third = await rearchive('Notes/Daily/Beta 2.md', `../${basename(second)}`)
    expect(third).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta 2\\.md\\.archived$`),
    )
    expect(await readdir(at('.nexus', 'archive', NOTES, 'Notes'))).toEqual(['Daily'])
  })

  it('refuses a page whose Collection’s id would not make a folder name', async () => {
    await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: 'notes/col' }))
    await refreshTree(root)
    const r = await mutate({ op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })
    expect(message(r)).toBe('Only pages and Sets inside a Collection can be archived.')
    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
    expect(await pathExists(at('.nexus', 'archive'))).toBe(false)
  })

  it('refuses what the tree doesn’t hold as the kind it names', async () => {
    const r = await mutate({ op: 'archive', path: 'Notes', kind: 'set' })
    expect(message(r)).toBe('That item can’t be changed.')
  })

  it('an archive whose move fails leaves no bundle in the Archive', async () => {
    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('the move failed'))
    expect((await mutate({ op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })).ok).toBe(
      false,
    )
    expect(await listBundles(root, ARCHIVE)).toEqual([])
    expect(await readdir(at('.nexus', 'archive', NOTES, 'Notes', 'Daily'))).toEqual([])
    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
  })
})

describe('restore — an archived item comes back by a plain move', () => {
  it('a restore returns it to its exact place by a plain move', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const r = await restore(bundlePath)
    expect(r.ok).toBe(true)
    expect(r.ok && r.value).not.toHaveProperty('unrestored')
    expect(r.ok && r.value).not.toHaveProperty('landedAs')
    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
    expect(await pageOrder()).toEqual([PAGE_A, PAGE_B, PAGE_G])
    expect(await pathExists(at(bundlePath))).toBe(false)
  })

  it('a path link naming where it lived follows it to a chosen destination', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
    expect(await text('Notes', 'Beta.md')).toBe(BETA)
    expect(heldTreeOf(root)?.collections[0].pages.at(-1)?.id).toBe(PAGE_B)
    expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Notes/Beta|Beta]]`)
  })

  it('a page pulled from an archived Set restores by a plain move to a given container', async () => {
    const bundlePath = await archive('Notes/Daily', 'set')
    expect((await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)).ok).toBe(true)
    expect(await text('Notes', 'Beta.md')).toBe(BETA)
    expect((await readdir(at(bundlePath, 'Daily'))).sort()).toEqual([
      'Alpha.md',
      'Gamma.md',
      '_pageset.json',
    ])
  })

  it('a nested Set pulled from an archived Set lands with its pages, and carries what was archived from within it into the landing Collection’s Archive', async () => {
    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
    const KEPT = '01KVGMT8BFP350FZZXAMG1QDVE'
    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
    await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${KEPT}\n---\nkept\n`)
    await reseed()
    await archive('Notes/Daily/Sub/Kept.md')
    const bundlePath = await archive('Notes/Daily', 'set')
    const r = await restore(join(bundlePath, 'Daily', 'Sub'), { kind: 'container', id: OTHER })
    expect(r.ok).toBe(true)
    expect((await readdir(at('Other', 'Sub'))).sort()).toEqual(['Deep.md', '_pageset.json'])
    expect((await readdir(at(bundlePath, 'Daily'))).sort()).toEqual([
      'Alpha.md',
      'Beta.md',
      'Gamma.md',
      '_pageset.json',
    ])
    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([bundlePath])
    const [refiled, ...rest] = await listBundles(root, { kind: 'archive', id: OTHER })
    expect(rest).toEqual([])
    expect(refiled).toMatchObject({
      artifactName: 'Kept.md',
      record: { id: KEPT, parent: { kind: 'container', id: SUB }, trail: [OTHER] },
    })
  })

  it('a page pulled from an archived Set and restored is put back by its Undo inside the Set’s bundle, at its folder', async () => {
    const bundlePath = await archive('Notes/Daily', 'set')
    const inner = join(bundlePath, 'Daily', 'Beta.md')
    const before = await bytesUnder(at(bundlePath))
    expect((await restore(inner, INTO_NOTES)).ok).toBe(true)
    const r = await mutate({ op: 'archive', path: 'Notes/Beta.md', kind: 'page', at: inner })
    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
    expect(await pathExists(at('Notes', 'Beta.md'))).toBe(false)
    expect(await bytesUnder(at(bundlePath))).toEqual(before)
    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([bundlePath])
  })

  it('a page pulled from an archived Set into another Collection is put back by its Undo inside the Set’s bundle', async () => {
    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
    await reseed()
    const bundlePath = await archive('Notes/Daily', 'set')
    const inner = join(bundlePath, 'Daily', 'Beta.md')
    const before = await bytesUnder(at(bundlePath))
    expect((await restore(inner, { kind: 'container', id: OTHER })).ok).toBe(true)
    const r = await mutate({ op: 'archive', path: 'Other/Beta.md', kind: 'page', at: inner })
    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
    expect(await bytesUnder(at(bundlePath))).toEqual(before)
    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
  })

  it('a Set pulled from an archived Set is put back by its Undo inside the Set’s bundle', async () => {
    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
    await reseed()
    const bundlePath = await archive('Notes/Daily', 'set')
    const inner = join(bundlePath, 'Daily', 'Sub')
    const before = await bytesUnder(at(bundlePath))
    expect((await restore(inner, INTO_NOTES)).ok).toBe(true)
    const r = await mutate({ op: 'archive', path: 'Notes/Sub', kind: 'set', at: inner })
    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
    expect(await pathExists(at('Notes', 'Sub'))).toBe(false)
    expect(await bytesUnder(at(bundlePath))).toEqual(before)
  })

  it('a page pulled from an archived Set and renamed is put back by its Undo under its new name', async () => {
    const bundlePath = await archive('Notes/Daily', 'set')
    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
    expect((await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)).ok).toBe(true)
    const renamed = {
      op: 'rename',
      path: 'Notes/Beta.md',
      kind: 'page',
      newName: 'Beta 2',
    } as const
    expect((await mutate(renamed)).ok).toBe(true)
    const r = await mutate({
      op: 'archive',
      path: 'Notes/Beta 2.md',
      kind: 'page',
      at: join(bundlePath, 'Daily', 'Beta.md'),
    })
    expect(r.ok && r.value.bundled).toEqual({ bundlePath: join(bundlePath, 'Daily', 'Beta 2.md') })
    expect(await text(bundlePath, 'Daily', 'Beta 2.md')).toBe(BETA)
    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
  })

  it('a restore’s reply carries the archive request that puts the item back as it was archived', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const raw = await readRawRecord(at(bundlePath))
    const r = await restore(bundlePath)
    expect(r.ok && r.value.undo).toEqual({
      op: 'archive',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
      at: bundlePath,
      name: 'Beta.md',
      record: raw,
    })
    const set = await archive('Notes/Daily', 'set')
    const inner = join(set, 'Daily', 'Alpha.md')
    const pulled = await restore(inner, INTO_NOTES)
    expect(pulled.ok && pulled.value.undo).toEqual({
      op: 'archive',
      path: 'Notes/Alpha.md',
      kind: 'page',
      at: inner,
      name: 'Alpha.md',
    })
  })

  it('a homeless restore’s Undo files the item back at its address with the record it was archived with', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(true)
    const r = await undo(await restore(bundlePath, INTO_NOTES))
    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
    expect(message(await restore(bundlePath))).toBe('The place this belonged to no longer exists.')
  })

  it('a step-aside restore’s Undo files the item back under its own name at its address', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
    await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))
    const restored = await restore(bundlePath)
    expect(restored.ok && restored.value.landedAs).toBe('Beta (2)')
    const r = await undo(restored)
    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
    expect(await text(bundlePath, 'Beta.md')).toBe(BETA)
    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
  })

  it('a restore into another Collection is put back by its Undo into the Archive it left', async () => {
    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
    await reseed()
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const r = await undo(await restore(bundlePath, { kind: 'container', id: OTHER }))
    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
    expect(await text(bundlePath, 'Beta.md')).toBe(BETA)
    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
  })

  it('an inner item restored under a stepped-aside name is put back by its Undo under the name it held', async () => {
    const bundlePath = await archive('Notes/Daily', 'set')
    const before = await bytesUnder(at(bundlePath))
    await mutate(minted({ op: 'createPage', parentPath: 'Notes', name: 'Beta' }))
    const restored = await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)
    expect(restored.ok && restored.value.landedAs).toBe('Beta (2)')
    expect((await undo(restored)).ok).toBe(true)
    expect(await bytesUnder(at(bundlePath))).toEqual(before)
  })

  it('an Undo whose address is taken mints a fresh stamp in that chain, with its record and its own name', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
    await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))
    const restored = await restore(bundlePath)
    await mkdir(at(bundlePath))
    const r = await undo(restored)
    const filed = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
    expect(filed).not.toBe(bundlePath)
    expect(filed).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
    )
    expect(await text(filed, 'Beta.md')).toBe(BETA)
    expect(await readFile(at(filed, '_record.json'), 'utf8')).toBe(record)
  })

  it('an archive carrying a record of the other kind, or an address outside an Archive, records the item afresh from where it stands', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const raw = await readRawRecord(at(bundlePath))
    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
    const afresh = async (at: string, carried: unknown): Promise<void> => {
      const r = await mutate({
        op: 'archive',
        path: 'Notes/Beta.md',
        kind: 'page',
        at,
        name: 'Beta.md',
        record: carried as Record<string, unknown>,
      })
      const filed = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
      expect(filed).toMatch(
        new RegExp(`^\\.nexus/archive/${NOTES}/Notes/[^/]+__Beta\\.md\\.archived$`),
      )
      expect(await readRecord(join(root, filed))).toMatchObject({
        id: PAGE_B,
        parent: { kind: 'container', id: NOTES },
      })
      expect((await restore(filed)).ok).toBe(true)
    }
    await afresh(bundlePath, { ...raw, entity: 'set' })
    await afresh(`.trash/Notes/Daily/${basename(bundlePath)}`, raw)
  })

  it('an inner item refused as homeless leaves its bundle byte-identical', async () => {
    const bundlePath = await archive('Notes/Daily', 'set')
    const before = await bytesUnder(at(bundlePath))
    expect(message(await restore(join(bundlePath, 'Daily', 'Beta.md')))).toBe(
      'The place this belonged to no longer exists.',
    )
    expect(await bytesUnder(at(bundlePath))).toEqual(before)
  })

  it('a restore landing on a taken name steps aside and says so', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const created = await mutate(
      minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }),
    )
    expect(created.ok).toBe(true)
    const r = await restore(bundlePath)
    expect(r.ok && r.value.landedAs).toBe('Beta (2)')
    expect(await text('Notes', 'Daily', 'Beta (2).md')).toBe(BETA)
  })

  it('its own identity in the Archive doesn’t refuse its restore, and a twin elsewhere does', async () => {
    expect((await restore(await archive('Notes/Daily/Beta.md'))).ok).toBe(true)
    const bundlePath = await archive('Notes/Daily/Beta.md')
    const twin = await mintBundle(root, ARCHIVE, at('Notes', 'Beta.md'))
    await writeRecord(twin, {
      entity: 'page',
      id: PAGE_B,
      parent: { kind: 'container', id: NOTES },
    })
    await copyFile(at(bundlePath, 'Beta.md'), join(twin, 'Beta.md'))
    await reseed()
    expect(message(await restore(bundlePath))).toBe(
      'Something in the nexus already carries this identity.',
    )
  })

  it('an Archive restore takes no Contexts lock', async () => {
    const lock = vi.spyOn(machine(), 'lock')
    const locked = (): boolean => lock.mock.calls.some(([key]) => key === contextsDir(root))
    const archived = await archive('Notes/Daily/Beta.md')
    lock.mockClear()
    expect((await restore(archived)).ok).toBe(true)
    expect(locked()).toBe(false)
    const deleted = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
    const trashed = deleted.ok ? (deleted.value.bundled?.bundlePath ?? '') : ''
    lock.mockClear()
    expect((await restore(trashed)).ok).toBe(true)
    expect(locked()).toBe(true)
  })

  it('an item archived out of a Set since trashed returns into that Set once the Set is restored, and with the Set still in the Trash its row reads homeless and its restore takes a destination', async () => {
    const beta = await archive('Notes/Daily/Beta.md')
    const gamma = await archive('Notes/Daily/Gamma.md')
    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(true)
    const homes = async (): Promise<Record<string, boolean>> => {
      const tree = await readNexus(root)
      const { byId } = await nexusPages(root, tree)
      const rows = bundleRows(await listBundles(root, ARCHIVE), ARCHIVE, tree, byId)
      return Object.fromEntries(rows.map((r) => [r.bundlePath, r.homeResolves]))
    }
    expect(await homes()).toEqual({ [beta]: false, [gamma]: false })
    expect(message(await restore(gamma))).toBe('The place this belonged to no longer exists.')
    expect((await restore(gamma, INTO_NOTES)).ok).toBe(true)
    expect(await pathExists(at('Notes', 'Gamma.md'))).toBe(true)
    const [daily] = await listBundles(root, { kind: 'trash' })
    expect((await restore(daily.bundlePath)).ok).toBe(true)
    expect(await homes()).toEqual({ [beta]: true })
    expect((await restore(beta)).ok).toBe(true)
    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
  })

  it('a Set’s link to its returning sibling stays on it past a namesake made meanwhile', async () => {
    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\nsee [[Alpha]]\n`)
    await reseed()
    const bundlePath = await archive('Notes/Daily', 'set')
    expect(
      (await mutate(minted({ op: 'createPage', parentPath: 'Notes', name: 'Alpha' }))).ok,
    ).toBe(true)
    await reseed()
    expect((await restore(bundlePath)).ok).toBe(true)
    expect(await text('Notes', 'Daily', 'Gamma.md')).toBe(
      `---\nID: ${PAGE_G}\n---\nsee [[Notes/Daily/Alpha|Alpha]]\n`,
    )
  })

  it('a restore whose origin has since been excluded finds no parent and takes a destination', async () => {
    const bundlePath = await archive('Notes/Daily/Beta.md')
    await writeExcludedFolders(root, ['Notes/Daily'])
    await settleNow({ push: () => {}, watch: async () => {} }, root)
    expect(message(await restore(bundlePath))).toBe('The place this belonged to no longer exists.')
    expect(await pathExists(at(bundlePath, 'Beta.md'))).toBe(true)
    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
    expect(await text('Notes', 'Beta.md')).toBe(BETA)
  })
})

describe('a delete from the Archive', () => {
  const LINKER = `---\nID: ${PAGE_K}\nRelated: "[[Beta]]"\n---\nlinker\n`
  const related = async (): Promise<unknown> =>
    splitFrontmatter(await text('Notes', 'Linker.md')).Related
  const trash = async (
    archived: string,
    kind: 'page' | 'set' | 'collection' = 'page',
  ): Promise<string> => {
    const r = await mutate({ op: 'delete', path: archived, kind })
    expect(r.ok).toBe(true)
    return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
  }
  const UNDO: RestoreDestination = { kind: 'archive' }

  beforeEach(async () => {
    await writeFile(at('Notes', 'Linker.md'), LINKER)
    await reseed()
  })

  it('goes to the Trash under the chain it was archived from, keeping the bundle it left', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    expect(trashed).toMatch(/^\.trash\/Notes\/Daily\/[^/]+__Beta\.md\.deleted$/)
    expect(await text(trashed, 'Beta.md')).toBe(BETA)
    expect(await readRecord(at(trashed))).toMatchObject({
      entity: 'page',
      id: PAGE_B,
      parent: { kind: 'container', id: DAILY },
      place: { above: PAGE_G, below: PAGE_A },
      trail: [NOTES],
      archive: archived,
    })
    expect(await pathExists(at(archived))).toBe(false)
  })

  it('strips the Link values naming it, and records them', async () => {
    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
    expect(await related()).toBeUndefined()
    expect(await readRecord(at(trashed))).toMatchObject({
      links: [{ page: PAGE_K, property: 'prop_related', value: '[[Beta]]' }],
    })
  })

  it('an archived Set takes the views naming it and its sub-Sets', async () => {
    await mkdir(at('Notes', 'Daily', 'Sub'), { recursive: true })
    await writeFile(at('Notes', 'Daily', 'Sub', '_pageset.json'), JSON.stringify({ id: SUB }))
    const filter = (rules: unknown[]) => ({ match: 'all', rules })
    await writeFile(
      at('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: NOTES,
        views: [
          {
            id: 'view_1',
            name: 'V',
            type: 'table',
            filter: filter([
              { property_id: '_location', op: 'is', values: [DAILY, 'set_keep'] },
              { property_id: '_location', op: 'is_inside', values: [SUB] },
            ]),
          },
        ],
      }),
    )
    await reseed()
    await trash(await archive('Notes/Daily', 'set'), 'set')
    const { views } = await readJsonAt<{ views: { filter: unknown }[] }>(
      at('Notes', '_pagecollection.json'),
    )
    expect(views[0].filter).toEqual(
      filter([{ property_id: '_location', op: 'is', values: ['set_keep'] }]),
    )
  })

  it('an inner item’s delete takes it to the Trash, its record naming the address it held', async () => {
    const archived = await archive('Notes/Daily', 'set')
    const inner = join(archived, 'Daily', 'Beta.md')
    const trashed = await trash(inner)
    expect(trashed).toMatch(/^\.trash\/Notes\/Daily\/[^/]+__Beta\.md\.deleted$/)
    expect(await text(trashed, 'Beta.md')).toBe(BETA)
    expect(await readRecord(at(trashed))).toMatchObject({
      entity: 'page',
      id: PAGE_B,
      archive: inner,
    })
    expect((await readdir(at(archived, 'Daily'))).sort()).toEqual([
      'Alpha.md',
      'Gamma.md',
      '_pageset.json',
    ])
  })

  it('an inner Set’s delete owes the view edit naming it and its sub-Sets', async () => {
    const DEEPER = '01KVGMT8BFP350FZZXAMG1QDS1'
    await putJson(at('Notes', 'Daily', 'Sub', 'Deeper', '_pageset.json'), { id: DEEPER })
    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
    const sidecar = at('Notes', '_pagecollection.json')
    await putJson(sidecar, {
      id: NOTES,
      views: [
        {
          id: 'view_1',
          name: 'V',
          type: 'table',
          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [SUB] }] },
        },
      ],
    })
    await reseed()
    const archived = await archive('Notes/Daily', 'set')
    refuseWrites('editJsonStrict', (file) => file === sidecar)
    await trash(join(archived, 'Daily', 'Sub'), 'set')
    const [owed] = Object.values(await readNotes(root))
    const edit = owed?.kind === 'container' ? owed.edit : undefined
    expect(edit?.kind === 'gone' && [...edit.ids].sort()).toEqual([SUB, DEEPER])
  })

  it('refuses a kind its record doesn’t carry', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const r = await mutate({ op: 'delete', path: archived, kind: 'set' })
    expect(message(r)).toBe('That item can’t be changed.')
    expect(await text(archived, 'Beta.md')).toBe(BETA)
  })

  it('under the system Trash Mode, it leaves for the system trash with its metadata', async () => {
    await updatePageMetadata(root, PAGE_A, { icon: 'moon' })
    await updatePageMetadata(root, PAGE_B, { icon: 'star' })
    const archived = await archive('Notes/Daily/Beta.md')
    const trashToSystem = vi.fn((p: string) => rm(p, { recursive: true }))
    const r = await settledMutate(
      root,
      { op: 'delete', path: archived, kind: 'page' },
      { trashMode: 'system', trashToSystem },
    )
    expect(r.ok).toBe(true)
    expect(r.ok && r.value).not.toHaveProperty('bundled')
    expect(trashToSystem).toHaveBeenCalledWith(at(archived, 'Beta.md'))
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await pathExists(at(archived))).toBe(false)
    const month = await readShard(root, shardOf(PAGE_A)!)
    expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_A]: { icon: 'moon' } })
  })

  it('its Undo returns it to the Archive under the same name, its Link values back', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    const r = await restore(trashed, UNDO)
    expect(r.ok).toBe(true)
    expect(r.ok && r.value).not.toHaveProperty('landedAs')
    expect(await text(archived, 'Beta.md')).toBe(BETA)
    expect(await readRecord(at(archived))).toEqual({
      entity: 'page',
      id: PAGE_B,
      parent: { kind: 'container', id: DAILY },
      place: { above: PAGE_G, below: PAGE_A },
      trail: [NOTES],
    })
    expect(await related()).toBe('[[Beta]]')
    expect(await pathExists(at(trashed))).toBe(false)
    const daily = heldTreeOf(root)?.collections[0].sets[0]
    expect(daily?.pages.map((p) => p.title)).toEqual(['Alpha', 'Gamma'])
  })

  it('an inner item’s Undo returns it inside its Set’s bundle, its Link values back', async () => {
    const archived = await archive('Notes/Daily', 'set')
    const inner = join(archived, 'Daily', 'Beta.md')
    const before = await bytesUnder(at(archived))
    const trashed = await trash(inner)
    expect(await related()).toBeUndefined()
    expect((await restore(trashed, UNDO)).ok).toBe(true)
    expect(await bytesUnder(at(archived))).toEqual(before)
    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([archived])
    expect(await related()).toBe('[[Beta]]')
    expect(await pathExists(at(trashed))).toBe(false)
  })

  it('an inner item’s Undo after its Set’s restore returns it as its own Archive row', async () => {
    const archived = await archive('Notes/Daily', 'set')
    const trashed = await trash(join(archived, 'Daily', 'Beta.md'))
    expect((await restore(archived)).ok).toBe(true)
    expect((await restore(trashed, UNDO)).ok).toBe(true)
    const [own, ...rest] = await listBundles(root, ARCHIVE)
    expect(rest).toEqual([])
    expect(own.bundlePath).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
    )
    expect(own.record).toMatchObject({
      entity: 'page',
      id: PAGE_B,
      parent: { kind: 'container', id: DAILY },
    })
    expect(await text(own.bundlePath, 'Beta.md')).toBe(BETA)
    expect(await related()).toBe('[[Beta]]')
    expect(heldTreeOf(root)?.collections[0].sets[0].pages.map((p) => p.title)).toEqual([
      'Alpha',
      'Gamma',
    ])
  })

  describe('once a live Set above its archived Set moves into another Collection', () => {
    const IN_OTHER: BundleStore = { kind: 'archive', id: OTHER }
    /** `Notes/Daily/Sub` archived, its `Deep.md` deleted out of it, and `Daily` moved into Other, carrying `Sub`'s bundle into Other's Archive. */
    const deletedThenMoved = async (): Promise<{ trashed: string; carried: string }> => {
      await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
      await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
      await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
      await reseed()
      const archived = await archive('Notes/Daily/Sub', 'set')
      const trashed = await trash(join(archived, 'Sub', 'Deep.md'))
      const moved = await mutate({
        op: 'moveSet',
        path: 'Notes/Daily',
        newParentPath: 'Other',
        order: [DAILY],
      })
      expect(moved.ok).toBe(true)
      const carried = archived.replace(`/${NOTES}/`, `/${OTHER}/`)
      expect((await listBundles(root, IN_OTHER)).map((b) => b.bundlePath)).toEqual([carried])
      return { trashed, carried }
    }

    it('an inner item’s Undo returns it inside its Set’s carried bundle', async () => {
      const { trashed, carried } = await deletedThenMoved()
      const before = await bytesUnder(at(carried))
      expect((await restore(trashed, UNDO)).ok).toBe(true)
      expect(await bytesUnder(at(carried))).toEqual({
        ...before,
        [at(carried, 'Sub', 'Deep.md')]: DEEP,
      })
      expect(await listBundles(root, ARCHIVE)).toEqual([])
      expect((await listBundles(root, IN_OTHER)).map((b) => b.bundlePath)).toEqual([carried])
    })

    it('an inner item’s Undo after its Set’s restore returns it as its own row in that Collection’s Archive', async () => {
      const { trashed, carried } = await deletedThenMoved()
      expect((await restore(carried)).ok).toBe(true)
      expect((await restore(trashed, UNDO)).ok).toBe(true)
      expect(await listBundles(root, ARCHIVE)).toEqual([])
      const [own, ...rest] = await listBundles(root, IN_OTHER)
      expect(rest).toEqual([])
      expect(own).toMatchObject({
        artifactName: 'Deep.md',
        record: { id: PAGE_D, parent: { kind: 'container', id: SUB } },
      })
      expect(await text(own.bundlePath, 'Deep.md')).toBe(DEEP)
    })
  })

  it('its Undo mints a fresh bundle in the same Archive once the name is taken', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    await mkdir(at(archived), { recursive: true })
    expect((await restore(trashed, UNDO)).ok).toBe(true)
    const [other, ...rest] = (await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)
    expect(rest).toEqual([])
    expect(other).not.toBe(archived)
    expect(other).toMatch(
      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
    )
    expect(await text(other, 'Beta.md')).toBe(BETA)
    expect(await readdir(at(archived))).toEqual([])
  })

  it('a failed Undo leaves no bundle behind, and its retry lands under the same name', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('the move failed'))
    expect((await restore(trashed, UNDO)).ok).toBe(false)
    expect(await pathExists(at(archived))).toBe(false)
    expect(await listBundles(root, ARCHIVE)).toEqual([])
    expect(await text(trashed, 'Beta.md')).toBe(BETA)
    expect((await restore(trashed, UNDO)).ok).toBe(true)
    expect(await text(archived, 'Beta.md')).toBe(BETA)
  })

  it('a plain restore from the Trash returns it to where it was archived from', async () => {
    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
    expect((await restore(trashed)).ok).toBe(true)
    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
    expect(await pageOrder()).toEqual([PAGE_A, PAGE_B, PAGE_G])
  })

  it('leaves the Link values another archived page sharing its origin still answers', async () => {
    const first = await archive('Notes/Daily/Beta.md')
    expect(
      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))).ok,
    ).toBe(true)
    await archive('Notes/Daily/Beta.md')
    await trash(first)
    expect(await related()).toBe('[[Beta]]')
  })

  it('a live page’s delete owes an archived linker whose strip failed, and its record stays whole', async () => {
    const linker = await archive('Notes/Linker.md')
    refuseWrites('rewritePreservingTimes', (file) => file.startsWith(at(linker)))
    const r = await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
    expect(r.ok && r.value.cascade).toMatchObject({
      warning: 'Couldn’t update 1 Item.',
      owed: true,
    })
    const bundlePath = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
    expect(await readRecord(at(bundlePath))).not.toHaveProperty('partial')
    expect(splitFrontmatter(await text(linker, 'Linker.md')).Related).toBe('[[Beta]]')
  })

  it('a live page’s delete leaves the Link values an archived page at its path still answers', async () => {
    await archive('Notes/Daily/Beta.md')
    expect(
      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))).ok,
    ).toBe(true)
    expect((await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })).ok).toBe(
      true,
    )
    expect(await related()).toBe('[[Beta]]')
  })

  it('a trashed page’s link to an archived page follows it to where it lands on restore', async () => {
    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\n[[Alpha]]\n`)
    await reseed()
    const alpha = await archive('Notes/Daily/Alpha.md')
    const gamma = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
    expect(
      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Alpha' }))).ok,
    ).toBe(true)
    const back = await restore(alpha)
    expect(back.ok && back.value.landedAs).toBe('Alpha (2)')
    expect((await restore(gamma.ok ? (gamma.value.bundled?.bundlePath ?? '') : '')).ok).toBe(true)
    expect(await text('Notes', 'Daily', 'Gamma.md')).toContain('[[Alpha (2)]]')
  })

  it('a trashed page’s link a live page and an archived page both answer names the live one', async () => {
    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\n[[Alpha]]\n`)
    await reseed()
    await archive('Notes/Daily/Alpha.md')
    expect(
      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Alpha' }))).ok,
    ).toBe(true)
    const gamma = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
    expect(
      (
        await mutate({
          op: 'rename',
          path: 'Notes/Daily/Alpha.md',
          kind: 'page',
          newName: 'Alpha 2',
        })
      ).ok,
    ).toBe(true)
    expect((await restore(gamma.ok ? (gamma.value.bundled?.bundlePath ?? '') : '')).ok).toBe(true)
    expect(await text('Notes', 'Daily', 'Gamma.md')).toContain('[[Alpha 2]]')
  })

  const scoredBeta = async (): Promise<void> => {
    await seedNexus(root, {
      defs: [
        { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        { id: 'prop_score', label: 'Score', key: 'Score', type: 'number' },
      ],
    })
    await writeFile(
      at('Notes', '_pagecollection.json'),
      JSON.stringify({ id: NOTES, properties: ['prop_score'] }),
    )
    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\nScore: 3\n---\nbeta\n`)
    await reseed()
  }

  it('its Undo keeps the page’s values once its Collection is in the Trash', async () => {
    await scoredBeta()
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    await trash('Notes', 'collection')
    expect((await restore(trashed, UNDO)).ok).toBe(true)
    expect(splitFrontmatter(await text(archived, 'Beta.md')).Score).toBe(3)
  })

  it('its Undo refuses once its Collection is gone for good, and the page stays in the Trash', async () => {
    await scoredBeta()
    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
    const notes = await trash('Notes', 'collection')
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { permanentDelete: true } }),
    )
    await refreshTree(root)
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: notes }, nexusDeps)).ok,
    ).toBe(true)
    expect(message(await restore(trashed, UNDO))).toBe(
      'The place this belonged to no longer exists.',
    )
    expect(await text(trashed, 'Beta.md')).toContain('Score: 3')
    expect(await pathExists(at('.nexus', 'archive', NOTES))).toBe(false)
  })

  it('its Undo lands while a root Collection’s sidecar reads unreadable', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    await writeFile(at('Notes', '_pagecollection.json'), '{ not json')
    await refreshTree(root)
    expect(message(await restore(trashed, UNDO))).toBe('')
    expect(await text(archived, 'Beta.md')).toBe(BETA)
  })

  it('refuses the Archive as a destination for an Archive bundle', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    expect(message(await restore(archived, UNDO))).toBe(NO_DESTINATION)
    expect(await text(archived, 'Beta.md')).toBe(BETA)
  })

  it('emptying it from the Trash gives it up for good', async () => {
    const archived = await archive('Notes/Daily/Beta.md')
    const trashed = await trash(archived)
    expect((await mutate({ op: 'emptyBundle', bundlePath: trashed })).ok).toBe(true)
    expect(await pathExists(at(trashed))).toBe(false)
    expect(await pathExists(at(archived))).toBe(false)
  })
})
