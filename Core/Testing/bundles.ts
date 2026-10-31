// The bundle suites' shared fixtures: the seeded Nexus their deletes, restores, and empties run on, its bundles found on disk or seeded, the rows a browser lists, and the channels and row queries every bundle browser mounts through.

import type { Dirent } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { act } from 'react'
import { afterEach, beforeEach, expect, type Mock, vi } from 'vitest'
import { stubDialer } from '../vitest.setup'
import { type ListedBundle, listBundles, mintBundle } from '../Bundles/bundle'
import type { PropertyRecord } from '../Bundles/record'
import { type BundleRow, matched } from '../Bundles/rows'
import { splitFrontmatter } from '../Files/pageFile'
import { landValue } from '../Files/rootValues'
import { createFolderEntity } from '../Nexus/folderEntity'
import { rewriteRoot, rewriteRootAt } from '../Nexus/governedRoot'
import { newId } from '../Nexus/ids'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { assignProperty } from '../Properties/assignment'
import { createProperty } from '../Properties/registryProperty'
import { installMachine } from '../Platform/machine'
import { join } from '../Paths/posix'
import { createTestPage } from './createTestPage'
import { readJsonAt, tempRoot } from './hostFs'
import { diskMachine } from './machines'
import { settledMutate } from './settledMutate'

export const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
export const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
export const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'

export function bundleNexusEachTest(prefix: string, onSeed: (root: string) => void): void {
  let root: string
  beforeEach(async () => {
    root = tempRoot(prefix)
    onSeed(root)
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: '2026' }),
    )
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' }],
      }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap', '<Projects>': ['Pommora'] }),
    )
    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alpha.md'),
      `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await openSession(root)
    installMachine({ ...diskMachine(), trashToSystem: async () => {} })
  })
  afterEach(async () => {
    installMachine(diskMachine())
    vi.restoreAllMocks()
    dropLiveTree()
    closeSession()
    await rm(root, { recursive: true, force: true })
  })
}

/** Every bundle folder under `.trash`, a recordless one included, never descending into one, exactly as the listing walks. */
export async function bundleDirs(root: string): Promise<string[]> {
  const walk = async (dir: string): Promise<string[]> => {
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const out: string[] = []
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const abs = join(dir, e.name)
      if (e.name.endsWith('.deleted')) out.push(abs)
      else out.push(...(await walk(abs)))
    }
    return out
  }
  return walk(join(root, '.trash'))
}

export async function onlyBundle(root: string): Promise<ListedBundle> {
  const listed = await listBundles(root, { kind: 'trash' })
  expect(listed).toHaveLength(1)
  return listed[0]
}

export const stateOrder = async (root: string): Promise<Record<string, unknown>> =>
  (await readJsonAt<{ order: Record<string, unknown> }>(join(root, '.nexus', 'state.json'))).order

interface BrowserChannels {
  listed: BundleRow[]
  children: Record<string, BundleRow[]>
  picked: string | null
  list: Mock
  menu: Mock
  mutated: Mock
}

export function stubBrowserEachTest(
  more: () => Record<string, unknown> = () => ({}),
): BrowserChannels {
  const channels = {} as BrowserChannels
  beforeEach(() => {
    Object.assign(channels, { listed: [], children: {}, picked: null })
    channels.list = vi.fn(async () => ({ ok: true, value: channels.listed }))
    channels.menu = vi.fn(async () => ({ ok: true, value: channels.picked }))
    channels.mutated = vi.fn(async () => ({ ok: true, value: {} }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': channels.list,
      'bundles:children': vi.fn(async (addresses: string[]) => ({
        ok: true,
        value: addresses.map((address) => channels.children[address] ?? []),
      })),
      menu: channels.menu,
      mutate: channels.mutated,
      'bundles:permanentDelete': vi.fn(async () => ({ ok: true, value: false })),
      ...more(),
    })
  })
  return channels
}

export const boxOf = (host: ParentNode, title: string): HTMLElement =>
  host.querySelector(`[aria-label="Select ${title}"]`) as HTMLElement

export const rowOf = (host: ParentNode, title: string): HTMLElement =>
  boxOf(host, title).closest('.data-row') as HTMLElement

export const press = (host: ParentNode, title: string, detail: number): Promise<void> =>
  act(async () => {
    rowOf(host, title).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
  })

export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
  const { title = 'Alpha' } = over
  return matched({
    bundlePath: `.trash/${title}.deleted`,
    kind: 'page',
    title,
    crumbs: [{ kind: 'collection', title: 'Notes' }],
    storedAt: 0,
    homeResolves: true,
    ...over,
  })
}

export const seedPropertyBundle = (root: string, record: PropertyRecord): Promise<string> =>
  mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`), record)

export const trashedBundle = async (
  root: string,
  entity: string,
  artifact?: string,
): Promise<string> => {
  const found = (await listBundles(root, { kind: 'trash' })).find(
    (b) => b.record.entity === entity && (!artifact || b.artifactName === artifact),
  )
  if (!found) throw new Error(`no ${entity} bundle`)
  return found.bundlePath
}
export const trashedNotes = async (root: string): Promise<string> =>
  join(root, await trashedBundle(root, 'collection', 'Notes'), 'Notes')
export const priorityOn = async (file: string): Promise<unknown> =>
  splitFrontmatter(await readFile(file, 'utf8')).Priority
export const restoreTasks = async (root: string): Promise<unknown> =>
  settledMutate(root, {
    op: 'restore',
    bundlePath: await trashedBundle(root, 'collection', 'Tasks'),
  })

export async function seedPriority(
  root: string,
): Promise<{ tasks: string; tasksPage: string; propertyId: string }> {
  const made = await createFolderEntity(root, 'collection', 'Tasks', newId())
  const created = await createProperty(root, {
    label: 'Priority',
    type: 'select',
    select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
  })
  if (!made.ok || !created.ok) throw new Error('setup failed')
  const tasks = made.value.path
  const propertyId = created.value.id
  await assignProperty(root, tasks, propertyId)
  await assignProperty(root, join(root, 'Notes'), propertyId)
  const page = await createTestPage(tasks, 'Task', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  const tasksPage = page.value.path
  for (const file of [tasksPage, join(root, 'Notes', 'Daily', 'Alpha.md')])
    await rewriteRootAt(
      file,
      rewriteRoot((raw) => landValue(raw, 'Priority', ['hi'])),
    )
  await refreshTree(root)
  for (const path of ['Tasks', 'Notes'])
    await settledMutate(root, { op: 'delete', path, kind: 'collection' })
  return { tasks, tasksPage, propertyId }
}
