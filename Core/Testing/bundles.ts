// The bundle suites' shared fixtures: the seeded Nexus their deletes, restores, and empties run on, its bundles found on disk or seeded, the rows a browser lists, and the channels and row queries every bundle browser mounts through.

import type { Dirent } from 'node:fs'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { type ListedBundle, listBundles, mintBundle } from '../Bundles/bundle'
import type { PropertyRecord } from '../Bundles/record'
import { type BundleRow, matched } from '../Bundles/rows'
import { dropLiveTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { installMachine } from '../Platform/machine'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from './hostFs'
import { diskMachine } from './machines'

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
