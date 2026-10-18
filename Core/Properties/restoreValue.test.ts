import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { contextsDir, contextsRegistryFile, nexusDir } from '../Paths/paths'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { settledMutate } from '../Testing/settledMutate'
import type { TrashDeps } from '../Trash/bundle'
import type { PropertyDefinition } from './properties'
import type { PropertyValue } from './propertyValue'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
const PAGE_ID = '01ARZ3NDEKPSV4RRFFQ69G5FAV'

let root: string
let pagePath: string
let spacePath: string
const ids: Record<string, string> = {}

const property = async (over: Omit<PropertyDefinition, 'id'>): Promise<string> => {
  const made = await createProperty(root, { id: '', ...over } as PropertyDefinition)
  if (!made.ok) throw new Error('setup')
  return made.value.id
}

beforeEach(async () => {
  root = tempRoot('pom-restore-')
  await mkdir(contextsDir(root), { recursive: true })
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(join(nexusDir(root), 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  const groupId = newId()
  const group = await createContextGroup(root, 'Projects', groupId)
  if (!group.ok) throw new Error('setup')
  const space = await createSpace(root, groupId, 'Pommora', newId())
  if (!space.ok) throw new Error('setup')
  spacePath = space.value.path
  const col = await createFolderEntity(root, 'collection', 'Notes', newId())
  if (!col.ok) throw new Error('setup')
  pagePath = 'Notes/One.md'
  ids.Tags = await property({
    name: 'Tags',
    type: 'multiSelect',
    select_options: [{ value: 'Work' }, { value: 'Life' }],
  })
  ids.Status = await property({
    name: 'Status',
    type: 'select',
    select_options: [{ value: 'Doing' }, { value: 'Done' }],
  })
  ids.Count = await property({ name: 'Count', type: 'number' })
  for (const id of Object.values(ids)) await assignProperty(root, col.value.path, id)
  await writeFile(join(root, pagePath), `---\nID: ${PAGE_ID}\n---\nb\n`)
  await openSession(root)
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

interface Target {
  path: () => string
  seed: (key: string, raw: unknown, line: string) => Promise<void>
  held: (key: string) => Promise<string | undefined>
}

const pageFile = () => join(root, pagePath)
const sidecarFile = () => join(root, spacePath, '_space.json')
const sidecar = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(sidecarFile(), 'utf8'))

// A page's key as its frontmatter lines spell it; a Space's as its JSON value.
const page: Target = {
  path: () => pagePath,
  seed: async (_key, _raw, line) => {
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\n${line}\n---\nb\n`)
    await refreshTree(root)
  },
  held: async (key) => {
    const lines = (await readFile(pageFile(), 'utf8')).split('\n')
    const at = lines.findIndex((l) => l.startsWith(`${key}:`))
    if (at < 0) return undefined
    const end = lines.findIndex((l, i) => i > at && !l.startsWith('  '))
    return lines.slice(at, end).join('\n')
  },
}
const space: Target = {
  path: () => spacePath,
  seed: async (key, raw) => {
    await writeFile(sidecarFile(), JSON.stringify({ ...(await sidecar()), [key]: raw }))
    await refreshTree(root)
  },
  held: async (key) => {
    const sc = await sidecar()
    return Object.hasOwn(sc, key) ? JSON.stringify(sc[key]) : undefined
  },
}

const set = (target: Target, key: string, value: PropertyValue | null) =>
  settledMutate(root, { op: 'setProperty', path: target.path(), propertyId: ids[key], value }, deps)
const restore = (target: Target, key: string, held: unknown) =>
  settledMutate(root, { op: 'restoreValue', path: target.path(), propertyId: ids[key], held }, deps)

interface Case {
  title: string
  key: string
  raw?: unknown
  line?: string
  value: PropertyValue | null
  picked: { page: string | undefined; space: string | undefined }
}

const cases: Case[] = [
  {
    title: 'a Multi-Select holding a word in another casing, picked, restores the word',
    key: 'Tags',
    raw: ['work'],
    line: 'Tags:\n  - work',
    value: { kind: 'multiSelect', value: ['Work'] },
    picked: { page: 'Tags:\n  - Work\n  - work', space: '["Work","work"]' },
  },
  {
    title: 'a Multi-Select an unpick cleared restores its option and its foreign word',
    key: 'Tags',
    raw: ['Work', 'ideas'],
    line: 'Tags:\n  - Work\n  - ideas',
    value: { kind: 'multiSelect', value: [] },
    picked: { page: undefined, space: undefined },
  },
  {
    title: 'a Select holding a word in another casing, picked, restores the word',
    key: 'Status',
    raw: 'done',
    line: 'Status: done',
    value: { kind: 'select', value: 'Doing' },
    picked: { page: 'Status:\n  - Doing', space: '["Doing"]' },
  },
  {
    title: 'a Number holding text it can’t read, set, restores the text',
    key: 'Count',
    raw: 'abc',
    line: 'Count: abc',
    value: { kind: 'number', value: 5 },
    picked: { page: 'Count: 5', space: '5' },
  },
  {
    title: 'a Multi-Select given another option restores its one option',
    key: 'Tags',
    raw: ['Work'],
    line: 'Tags:\n  - Work',
    value: { kind: 'multiSelect', value: ['Work', 'Life'] },
    picked: { page: 'Tags:\n  - Work\n  - Life', space: '["Work","Life"]' },
  },
  {
    title: 'a key the file didn’t hold, set, leaves on the restore',
    key: 'Count',
    value: { kind: 'number', value: 5 },
    picked: { page: 'Count: 5', space: '5' },
  },
]

describe.each([
  ['a page', page, 'page'],
  ['a Space', space, 'space'],
] as const)('a restore on %s writes back exactly what the file held', (_, target, kind) => {
  it.each(cases.map((c) => [c.title, c] as const))('%s', async (_, {
    key,
    raw,
    line,
    value,
    picked,
  }) => {
    const held = raw === undefined ? undefined : kind === 'page' ? line : JSON.stringify(raw)
    if (raw !== undefined) await target.seed(key, raw, line ?? '')
    expect(await target.held(key)).toBe(held)
    expect((await set(target, key, value)).ok).toBe(true)
    expect(await target.held(key)).toBe(picked[kind])
    expect((await restore(target, key, raw)).ok).toBe(true)
    expect(await target.held(key)).toBe(held)
  })
})
