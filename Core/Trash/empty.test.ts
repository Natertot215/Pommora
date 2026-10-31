import * as liveTree from '../Nexus/liveTree'
import { handleMutate } from '../Nexus/mutate'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { basename, join, relative } from '../Paths/posix'
import { putJson, readJsonAt, failLandings, seedNexus } from '../Testing/hostFs'
import {
  bundleNexusEachTest,
  PAGE_A,
  PAGE_B,
  PAGE_C,
  priorityOn,
  restoreTasks,
  seedPriority,
  trashedBundle,
  trashedNotes,
} from '../Testing/bundles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installMachine } from '../Platform/machine'
import { diskMachine } from '../Testing/machines'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { listBundles } from '../Bundles/bundle'
import { readRecord } from '../Bundles/record'
import { readShard, updatePageMetadata } from '../Nexus/pageMetadata'
import { shardOf } from '../Nexus/ids'
import { refreshTree } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import type { MutateReply } from '../Nexus/mutateRequest'
import { createProperty } from '../Properties/registryProperty'

let root: string
bundleNexusEachTest('pom-empty-', (r) => (root = r))

describe('emptyBundle — giving a bundle up for good', () => {
  it('hands the artifact to the system trash and removes the spent bundle behind it', async () => {
    const handed: string[] = []
    installMachine({ ...diskMachine(), trashToSystem: async (p) => void handed.push(p) })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    // The artifact leaves under its own name — never a stamped folder wrapping it.
    expect(handed).toHaveLength(1)
    expect(handed[0].endsWith(join(listed.bundlePath, 'Alpha.md'))).toBe(true)
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it('with the switch on the artifact never reaches the system trash at all', async () => {
    const handed: string[] = []
    installMachine({ ...diskMachine(), trashToSystem: async (p) => void handed.push(p) })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { permanentDelete: true } }),
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it('emptying with Permanently Delete off, on a host with no system trash, refuses and leaves the item in its bundle', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    installMachine(diskMachine())
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(!r.ok && r.error.message).toBe('This host has no system trash.')
    expect(await pathExists(join(root, listed.bundlePath, 'Alpha.md'))).toBe(true)
  })

  it.each([
    false,
    true,
  ])('emptying a Set’s bundle drops both its pages’ entries (permanentDelete %s); trash alone keeps them', async (permanentDelete) => {
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
    await updatePageMetadata(root, PAGE_A, { icon: 'star' })
    await updatePageMetadata(root, PAGE_B, { locked: true })
    const pages = async () => {
      const month = await readShard(root, shardOf(PAGE_A)!)
      return month.kind === 'ok' ? month.pages : null
    }
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    await refreshTree(root)
    expect(await pages()).toEqual({ [PAGE_A]: { icon: 'star' }, [PAGE_B]: { locked: true } })
    const [listed] = await listBundles(root, { kind: 'trash' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { permanentDelete: permanentDelete } }),
    )
    await refreshTree(root)
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pages()).toEqual({})
  })

  describe('an inner item emptied out of its bundle', () => {
    const PAGE_D = '01KVGMT8BFP350FZZXAMG1QDVD'
    const sidecar = (): string => join(root, 'Other', '_pagecollection.json')
    const located = (values: string[]) => [
      {
        id: 'view_1',
        name: 'V',
        type: 'table',
        filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values }] },
      },
    ]
    const owingViews = async (values: string[]): Promise<string> => {
      await putJson(join(root, 'Notes', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
      await putJson(join(root, 'Notes', 'Daily', 'Sub', 'Deeper', '_pageset.json'), {
        id: 'set-deeper',
      })
      await putJson(sidecar(), { id: 'col-other', views: located(values) })
      await refreshTree(root)
      const refusal = failLandings((file) => file === sidecar())
      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
      refusal.mockRestore()
      expect((await readJsonAt(sidecar())).views).toEqual(located(values))
      const [listed] = await listBundles(root, { kind: 'trash' })
      return listed.bundlePath
    }
    beforeEach(async () => {
      await seedNexus(root, {
        defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
      })
      await putJson(join(root, 'Other', '_pagecollection.json'), { id: 'col-other' })
    })

    it('disposes only that item, drops its pages’ metadata, takes its carried values off the bundle’s record, and leaves its owed note keyed by its own address', async () => {
      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
      await writeFile(
        join(root, 'Other', 'Linker.md'),
        `---\nID: ${PAGE_C}\nRelated: "[[Alpha]]"\n---\nlinker`,
      )
      await updatePageMetadata(root, PAGE_A, { icon: 'star' })
      await updatePageMetadata(root, PAGE_B, { locked: true })
      await refreshTree(root)
      await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
      const [listed] = await listBundles(root, { kind: 'trash' })
      const bundle = join(root, listed.bundlePath)
      expect(await readRecord(bundle)).toMatchObject({
        links: [{ page: PAGE_C, property: 'prop_related', value: '[[Alpha]]' }],
      })
      const taker = join(root, 'Other', 'Taker.md')
      await writeFile(taker, `---\nID: ${PAGE_D}\nRelated: "[[Alpha]]"\n---\ntaker`)
      await refreshTree(root)
      const handed: string[] = []
      installMachine({
        ...diskMachine(),
        trashToSystem: async (p) => {
          handed.push(p)
          await rm(p, { recursive: true })
        },
      })
      failLandings((file) => file === taker)
      const item = join(bundle, 'Daily', 'Alpha.md')
      const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: relative(root, item) })
      vi.restoreAllMocks()
      expect(r.ok).toBe(true)
      expect(handed).toEqual([item])
      expect((await readdir(join(bundle, 'Daily'))).sort()).toEqual(['Beta.md', '_pageset.json'])
      const month = await readShard(root, shardOf(PAGE_A)!)
      expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_B]: { locked: true } })
      expect(await readRecord(bundle)).not.toHaveProperty('links')
      expect((await readNotes(root))[relative(root, item)]).toMatchObject({
        kind: 'container',
        at: relative(root, item),
        strip: ['Notes/Daily/Alpha.md'],
      })
    })

    it('an inner Set emptied while its bundle’s delete still owes its view edit takes the views naming it once the finish runs', async () => {
      const bundle = await owingViews(['set-sub', 'col-other'])
      const sub = join(bundle, 'Notes', 'Daily', 'Sub')
      expect((await settledMutate(root, { op: 'emptyBundle', bundlePath: sub })).ok).toBe(true)
      await finishOwed(root)
      expect((await readJsonAt(sidecar())).views).toEqual(located(['col-other']))
    })

    it('an inner Set emptied before its bundle comes back whole still takes the views naming it and its sub-Set, and keeps those naming what came back', async () => {
      const bundle = await owingViews(['set-sub', 'set-deeper', 'set-daily', 'col-other'])
      const sub = join(bundle, 'Notes', 'Daily', 'Sub')
      installMachine({ ...diskMachine(), trashToSystem: (p) => rm(p, { recursive: true }) })
      expect((await settledMutate(root, { op: 'emptyBundle', bundlePath: sub })).ok).toBe(true)
      expect(await pathExists(join(root, sub))).toBe(false)
      expect((await settledMutate(root, { op: 'restore', bundlePath: bundle })).ok).toBe(true)
      await finishOwed(root)
      expect((await readJsonAt(sidecar())).views).toEqual(located(['set-daily', 'col-other']))
    })
  })

  describe('a Collection emptied for good', () => {
    const ARCHIVED = join('.nexus', 'archive', 'col-notes')

    beforeEach(async () => {
      await seedNexus(root, {
        defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
      })
      await mkdir(join(root, 'Other'), { recursive: true })
      await writeFile(
        join(root, 'Other', '_pagecollection.json'),
        JSON.stringify({ id: 'col-other' }),
      )
      await refreshTree(root)
    })

    const emptyNotes = async () => {
      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
      const [listed] = await listBundles(root, { kind: 'trash' })
      return settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    }

    it.each([
      false,
      true,
    ])('a Collection emptied for good empties its Archive, its pages’ links stripped and their metadata dropped (permanentDelete %s)', async (permanentDelete) => {
      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
      const linker = join(root, 'Other', 'Linker.md')
      await writeFile(linker, `---\nID: ${PAGE_C}\nRelated: "[[Beta]]"\n---\nlinker`)
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })
      await updatePageMetadata(root, PAGE_B, { icon: 'star' })
      await writeFile(
        join(root, '.nexus', 'settings.json'),
        JSON.stringify({ personalization: { permanentDelete: permanentDelete } }),
      )
      await refreshTree(root)
      const handed: string[] = []
      installMachine({
        ...diskMachine(),
        trashToSystem: async (p) => {
          handed.push(p)
          await rm(p, { recursive: true })
        },
      })
      const r = await emptyNotes()
      expect(r.ok).toBe(true)
      if (permanentDelete) expect(await pathExists(join(root, ARCHIVED))).toBe(false)
      else expect(handed).toContain(join(root, ARCHIVED))
      expect(splitFrontmatter(await readFile(linker, 'utf8')).Related).toBeUndefined()
      const month = await readShard(root, shardOf(PAGE_B)!)
      expect(month.kind === 'ok' && month.pages).toEqual({})
    })

    it('emptying a trashed Collection keeps the archived records of a Set that stands live elsewhere', async () => {
      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })
      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
      const [listed] = await listBundles(root, { kind: 'trash' })
      await rename(join(root, listed.bundlePath, 'Notes', 'Daily'), join(root, 'Other', 'Daily'))
      await refreshTree(root)
      installMachine({ ...diskMachine(), trashToSystem: (p) => rm(p, { recursive: true }) })
      const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
      expect(r.ok).toBe(true)
      const kept = await listBundles(root, { kind: 'archive', id: 'col-other' })
      expect(kept.map(({ record }) => 'id' in record && record.id)).toEqual([PAGE_B])
      expect(await pathExists(join(root, ARCHIVED))).toBe(false)
    })

    it('a Collection emptied for good takes the saved views naming the Sets in its Archive', async () => {
      const sidecar = join(root, 'Other', '_pagecollection.json')
      const located = (values: string[]) => [
        {
          id: 'view_1',
          name: 'V',
          type: 'table',
          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values }] },
        },
      ]
      await writeFile(
        sidecar,
        JSON.stringify({ id: 'col-other', views: located(['set-daily', 'col-other']) }),
      )
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' })
      installMachine({ ...diskMachine(), trashToSystem: (p) => rm(p, { recursive: true }) })
      expect((await emptyNotes()).ok).toBe(true)
      expect((await readJsonAt(sidecar)).views).toEqual(located(['col-other']))
    })
  })

  it('emptying a copy’s bundle keeps the entry of the live page sharing its ID', async () => {
    await updatePageMetadata(root, PAGE_A, { icon: 'star' })
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha copy.md'), `---\nID: ${PAGE_A}\n---\ncopy`)
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha copy.md', kind: 'page' })
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    const month = await readShard(root, shardOf(PAGE_A)!)
    expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_A]: { icon: 'star' } })
  })

  it('of two trashed copies of one id the first restores and the second is refused as live', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha copy.md'), `---\nID: ${PAGE_A}\n---\ncopy`)
    await refreshTree(root)
    for (const path of ['Notes/Daily/Alpha copy.md', 'Notes/Daily/Alpha.md'])
      expect((await settledMutate(root, { op: 'delete', path, kind: 'page' })).ok).toBe(true)
    const claimed = (await nexusPages(root, await liveTree.liveTreeOf(root))).byId.get(PAGE_A)
    const bundles = await listBundles(root, { kind: 'trash' })
    const first = bundles.find((b) => claimed?.path.startsWith(`${b.bundlePath}/`))
    const second = bundles.find((b) => b !== first)
    const restore = (bundlePath = '') => settledMutate(root, { op: 'restore', bundlePath })
    const live = {
      ok: false,
      error: { message: 'Something in the nexus already carries this identity.' },
    }
    expect(await restore(second?.bundlePath)).toMatchObject(live)
    expect((await restore(first?.bundlePath)).ok).toBe(true)
    expect(await restore(second?.bundlePath)).toMatchObject(live)
  })

  it('refuses a chain folder that merely wears the suffix, bundles and all', async () => {
    // `.trash` mirrors the nexus, so a user's own folder can wear the bundle name anywhere in the chain. Path, root and suffix all pass here; only the record test refuses it.
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const chain = join(root, '.trash', 'Archive.deleted')
    await mkdir(chain, { recursive: true })
    await rename(join(root, listed.bundlePath), join(chain, basename(listed.bundlePath)))
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: '.trash/Archive.deleted' })
    expect(r.ok).toBe(false)
    // The real bundle inside it is untouched — it would have gone with the folder.
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('refuses a path inside the nexus but outside the trash, and one that escapes the root', async () => {
    expect((await settledMutate(root, { op: 'emptyBundle', bundlePath: 'Notes' })).ok).toBe(false)
    expect(await pathExists(join(root, 'Notes'))).toBe(true)
    const out = await settledMutate(root, { op: 'emptyBundle', bundlePath: '../escape' })
    expect(out.ok).toBe(false)
  })

  it('a spent bundle refuses rather than reporting success twice', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })).ok,
    ).toBe(true)
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })).ok,
    ).toBe(false)
  })

  it('refuses when the bundle holds more than the artifact, rather than erasing it', async () => {
    // `bundleArtifact` answers only for exactly one visible entry, so a sync client's conflict copy reads as no artifact at all. Removing the folder anyway would destroy the file with the switch OFF — the setting that promises the operating system keeps the last undo.
    const handed: string[] = []
    installMachine({ ...diskMachine(), trashToSystem: async (p) => void handed.push(p) })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const bundlePath = listed.bundlePath
    await writeFile(join(root, bundlePath, 'Alpha 2.md'), 'conflict copy')
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath })
    expect(r.ok).toBe(false)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
  })

  it('a system-trash handoff that rejects leaves the bundle whole and owes nothing', async () => {
    installMachine({
      ...diskMachine(),
      trashToSystem: async () => {
        throw new Error('nope')
      },
    })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
    expect(await readNotes(root)).toEqual({})
  })
})

describe('emptying a property’s Trash entry', () => {
  let tasks: string
  let tasksPage: string
  let propertyId: string
  beforeEach(async () => {
    ;({ tasks, tasksPage, propertyId } = await seedPriority(root))
    await settledMutate(root, { op: 'deleteProperty', propertyId })
    await restoreTasks(root)
  })

  // The system trash takes the bundle away, so no Trash entry for the property remains.
  const empty = async (): Promise<MutateReply> => {
    installMachine({
      ...diskMachine(),
      trashToSystem: (abs) => rm(abs, { recursive: true, force: true }),
    })
    return handleMutate(root, {
      op: 'emptyBundle',
      bundlePath: await trashedBundle(root, 'property'),
    })
  }

  it('emptying a property’s Trash entry drops it from every Collection still listing it', async () => {
    expect((await empty()).ok).toBe(true)
    const live = await readJsonAt(join(tasks, '_pagecollection.json'))
    expect(live.properties ?? []).not.toContain(propertyId)
    expect(live.property_stash).toBeUndefined()
    expect(JSON.stringify(live.views ?? [])).not.toContain(propertyId)
    expect(await priorityOn(tasksPage)).toBeUndefined()
    const notes = await trashedNotes(root)
    expect((await readJsonAt(join(notes, '_pagecollection.json'))).properties ?? []).not.toContain(
      propertyId,
    )
    expect(await priorityOn(join(notes, 'Daily', 'Alpha.md'))).toBeUndefined()
  })

  it('a later property reusing a deleted property’s key inherits nothing', async () => {
    const again = await createProperty(root, {
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
    })
    if (!again.ok) throw new Error('setup failed')
    expect((await empty()).ok).toBe(true)
    expect(await priorityOn(tasksPage)).toBeUndefined()
  })
})
