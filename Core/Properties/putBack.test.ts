import { mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../Paths/posix'
import { readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
import { contextsDir, contextsRegistryFile, nexusDir } from '../Paths/paths'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { newId } from '../Nexus/ids'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { settledMutate } from '../Testing/settledMutate'
import type { TrashDeps } from '../Trash/discard'
import type { PropertyDefinition } from './properties'
import type { PropertyValue } from './propertyValue'
import { renameProperty } from './registryProperty'
import type { MutateReply } from '../Nexus/mutateRequest'
import { splitFrontmatter } from '../Files/pageFile'
import { pathExists } from '../Files/atomicWrite'

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
const PAGE_ID = '01ARZ3NDEKPSV4RRFFQ69G5FAV'

let root: string
let pagePath: string
let spacePath: string
let groupId: string
let spaceId: string

const DEFS: PropertyDefinition[] = [
  {
    id: newId(),
    key: 'Tags',
    label: 'Tags',
    type: 'multiSelect',
    select_options: [
      { id: 'opt_Work', key: 'Work', label: 'Work' },
      { id: 'opt_Life', key: 'Life', label: 'Life' },
    ],
  },
  {
    id: newId(),
    key: 'Status',
    label: 'Status',
    type: 'select',
    select_options: [
      { id: 'opt_Doing', key: 'Doing', label: 'Doing' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ],
  },
  { id: newId(), key: 'Count', label: 'Count', type: 'number' },
]
const ids: Record<string, string> = Object.fromEntries(DEFS.map((d) => [d.key, d.id]))

beforeEach(async () => {
  root = tempRoot('pom-putback-')
  await mkdir(contextsDir(root), { recursive: true })
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(join(nexusDir(root), 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  groupId = newId()
  const group = await createContextGroup(root, 'Projects', groupId)
  if (!group.ok) throw new Error('setup')
  spaceId = newId()
  const space = await createSpace(root, groupId, 'Pommora', spaceId)
  if (!space.ok) throw new Error('setup')
  spacePath = space.value.path
  pagePath = 'Notes/One.md'
  await seedNexus(root, { defs: DEFS, assigned: { Notes: Object.values(ids) } })
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
const sidecar = () => readJsonAt(sidecarFile())

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
  settledMutate(
    root,
    { op: 'setProperty', paths: [target.path()], propertyId: ids[key], value },
    deps,
  )
/** Sends the record the write's own reply carries, as the window's undo does. */
const undo = async (written: MutateReply): Promise<MutateReply> => {
  if (!written.ok || !written.value.undo) throw new Error('The write answered no record to undo.')
  return settledMutate(root, written.value.undo, deps)
}

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
    value: { kind: 'multiSelect', value: ['opt_Work'] },
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
    value: { kind: 'select', value: 'opt_Doing' },
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
    value: { kind: 'multiSelect', value: ['opt_Work', 'opt_Life'] },
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
] as const)('an undo on %s puts back exactly what the file held', (_, target, kind) => {
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
    const written = await set(target, key, value)
    expect(written.ok).toBe(true)
    expect(await target.held(key)).toBe(picked[kind])
    expect((await undo(written)).ok).toBe(true)
    expect(await target.held(key)).toBe(held)
  })
})

describe('a write on a page', () => {
  it.each([
    'Status:',
    'Status: null',
    'Status: ""',
    'Status: "   "',
  ])('a write lifts the blank governed lines `%s` and `Tags: []`, leaving an ungoverned bare key', async (line) => {
    await page.seed('Status', null, `${line}\nTags: []\nMood:`)
    await set(page, 'Count', { kind: 'number', value: 5 })
    expect(await readFile(pageFile(), 'utf8')).toBe(
      `---\nID: ${PAGE_ID}\nMood:\nCount: 5\n---\nb\n`,
    )
  })
})

describe('an undo on a Space', () => {
  it('an undo of a write over a blank value leaves no key', async () => {
    await space.seed('Status', null, '')
    const written = await set(space, 'Status', { kind: 'select', value: 'opt_Doing' })
    expect(await space.held('Status')).toBe('["Doing"]')
    await undo(written)
    expect(await space.held('Status')).toBeUndefined()
  })
})

describe('an undo on a page', () => {
  it('an undo of a write over a bare key leaves no line', async () => {
    await page.seed('Status', null, 'Status:')
    const written = await set(page, 'Status', { kind: 'select', value: 'opt_Doing' })
    expect(await page.held('Status')).toBe('Status:\n  - Doing')
    await undo(written)
    expect(await page.held('Status')).toBeUndefined()
  })

  it('a cleared key between two others leaves no line, and its undo puts it back where it stood, byte for byte', async () => {
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\nNote: a\nCount: 1\nZed: z\n---\nb\n`)
    await refreshTree(root)
    const bytes = await readFile(pageFile(), 'utf8')
    const written = await set(page, 'Count', null)
    expect(await readFile(pageFile(), 'utf8')).toBe(
      `---\nID: ${PAGE_ID}\nNote: a\nZed: z\n---\nb\n`,
    )
    await undo(written)
    expect(await readFile(pageFile(), 'utf8')).toBe(bytes)
  })

  it('a cleared key above a number-like key comes back above it, byte for byte', async () => {
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\nNote: a\nCount: 1\n2026: x\nZed: z\n---\nb\n`)
    await refreshTree(root)
    const bytes = await readFile(pageFile(), 'utf8')
    const written = await set(page, 'Count', null)
    await undo(written)
    expect(await readFile(pageFile(), 'utf8')).toBe(bytes)
  })

  it('a cleared key whose neighbour below left since comes back last', async () => {
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\nCount: 1\nNote: a\nZed: z\n---\nb\n`)
    await refreshTree(root)
    const written = await set(page, 'Count', null)
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\nZed: z\n---\nb\n`)
    await undo(written)
    expect(await readFile(pageFile(), 'utf8')).toBe(
      `---\nID: ${PAGE_ID}\nZed: z\nCount: 1\n---\nb\n`,
    )
  })

  it('a tidied sibling stays tidied', async () => {
    await writeFile(pageFile(), `---\nID: ${PAGE_ID}\nStatus: [Doing, Done]\nCount: 1\n---\nb\n`)
    await refreshTree(root)
    await undo(await set(page, 'Count', { kind: 'number', value: 5 }))
    const fm = splitFrontmatter(await readFile(pageFile(), 'utf8'))
    expect([fm.Count, fm.Status]).toEqual([1, ['Done']])
  })

  it('an undo that changes nothing leaves the file and its modification time alone', async () => {
    await page.seed('Count', 1, 'Count: 1')
    const written = await set(page, 'Count', { kind: 'number', value: 1 })
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(pageFile(), past, past)
    const bytes = await readFile(pageFile(), 'utf8')
    await undo(written)
    expect(await readFile(pageFile(), 'utf8')).toBe(bytes)
    expect(Math.floor((await stat(pageFile())).mtimeMs / 1000)).toBe(
      Math.floor(past.getTime() / 1000),
    )
  })

  it('a key renamed between the write and its undo comes back under its new name', async () => {
    await page.seed('Count', 1, 'Count: 1')
    const written = await set(page, 'Count', { kind: 'number', value: 5 })
    expect((await renameProperty(root, ids.Count, 'Total')).ok).toBe(true)
    await undo(written)
    expect([await page.held('Total'), await page.held('Count')]).toEqual(['Total: 1', undefined])
  })

  it('an unknown Space title survives a Context undo', async () => {
    await page.seed('<Projects>', ['Pommora', 'Ghost'], '<Projects>: [Pommora, Ghost]')
    const written = await settledMutate(
      root,
      { op: 'setContext', paths: [pagePath], contextId: groupId, spaceIds: [] },
      deps,
    )
    expect(await page.held('<Projects>')).toBeUndefined()
    await undo(written)
    expect(await page.held('<Projects>')).toBe('<Projects>: [Pommora, Ghost]')
  })

  it('an entry naming a file that’s gone reports it missed', async () => {
    const written = await set(page, 'Count', { kind: 'number', value: 5 })
    await rm(pageFile())
    await refreshTree(root)
    const back = await undo(written)
    expect(back.ok && back.value.cascade?.warning).toBe('Couldn’t update 1 Item.')
    expect(back.ok && back.value.missed).toEqual(
      written.ok && written.value.undo?.op === 'putBack' && written.value.undo.entries,
    )
    expect(await pathExists(pageFile())).toBe(false)
  })

  it('a Context tag’s undo lands while the property list is damaged', async () => {
    const written = await settledMutate(
      root,
      { op: 'setContext', paths: [pagePath], contextId: groupId, spaceIds: [spaceId] },
      deps,
    )
    expect(await page.held('<Projects>')).toBe('<Projects>:\n  - Pommora')
    await writeFile(join(nexusDir(root), 'properties.json'), '{')
    expect((await undo(written)).ok).toBe(true)
    expect(await page.held('<Projects>')).toBeUndefined()
  })
})

describe('an undo of a Space link', () => {
  it('puts back both halves', async () => {
    const areas = newId()
    if (!(await createContextGroup(root, 'Areas', areas)).ok) throw new Error('setup')
    const home = await createSpace(root, areas, 'Home', newId())
    if (!home.ok) throw new Error('setup')
    await refreshTree(root)
    const written = await settledMutate(
      root,
      { op: 'setContext', paths: [home.value.path], contextId: groupId, spaceIds: [spaceId] },
      deps,
    )
    expect(
      written.ok && written.value.undo?.op === 'putBack' && written.value.undo.entries,
    ).toHaveLength(2)
    await undo(written)
    const near = await readJsonAt(join(root, home.value.path, '_space.json'))
    expect([Object.hasOwn(near, '<Projects>'), Object.hasOwn(await sidecar(), '<Areas>')]).toEqual([
      false,
      false,
    ])
  })
})
