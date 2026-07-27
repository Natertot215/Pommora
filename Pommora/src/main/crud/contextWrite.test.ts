import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createContextGroup,
  createSpace,
  loadContextWorld,
  setAgendaContext,
  setPageContext,
  setSpaceColor,
  setSpaceContext,
} from './contextWrite'
import { updateAgendaItem, updateAgendaProperty } from './agendaEntity'
import { rawLayoutSchema } from '@shared/blocks'
import { contextsRegistryFile, contextsDir, nexusDir } from '../paths'
import { splitFrontmatter } from '../readNexus'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-ctxwrite-'))
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [
        { id: '_tier3', title: 'Projects', singular: 'Project' },
        { id: 'ctxC', title: 'Classes', singular: 'Class' },
      ],
    }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(contextsDir(root), 'Classes', 'CS 161'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Classes', 'CS 161', '_space.json'),
    JSON.stringify({ id: 'sp-cs' }),
  )
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const world = async () => {
  const w = await loadContextWorld(root)
  if (!w.ok) throw new Error('world load failed')
  return w.value
}

describe('createContextGroup', () => {
  it('appends a ULID entry and mkdirs the context folder', async () => {
    const r = await createContextGroup(root, 'Clients')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    const entry = reg.contexts.find((c: { title: string }) => c.title === 'Clients')
    expect(entry.id).toBe(r.value.id)
    expect(entry.singular).toBe('Clients')
    const entries = await readdir(join(contextsDir(root), 'Clients'))
    expect(entries).toEqual([])
  })

  it('disambiguates a taken title and bans brackets', async () => {
    const dup = await createContextGroup(root, 'Projects')
    expect(dup.ok).toBe(true)
    if (dup.ok) expect(dup.value.path).toBe('.nexus/contexts/Projects 2')
    const bad = await createContextGroup(root, 'No[pe]')
    expect(bad.ok).toBe(false)
  })

  it('uniqueness folds case — a case-variant twin would share one folder', async () => {
    const dup = await createContextGroup(root, 'projects')
    expect(dup.ok).toBe(true)
    if (dup.ok) expect(dup.value.path).toBe('.nexus/contexts/projects 2')
  })
})

describe('createSpace', () => {
  it('creates folder + sidecar (no icon, no color) seeded with the 2×2 block doc', async () => {
    const r = await createSpace(root, '_tier3', 'Sapphire')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path).toBe('.nexus/contexts/Projects/Sapphire')
    const sc = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'), 'utf8'),
    )
    expect(typeof sc.id).toBe('string')
    expect(sc.icon).toBeUndefined()
    expect(sc.color).toBeUndefined()
    expect(sc.blocks).toHaveLength(4)
    expect(sc.blocks.every((b: { type: string }) => b.type === 'markdown')).toBe(true)
    const layout = rawLayoutSchema.parse(sc.layout)
    expect(layout.bands).toHaveLength(2)
    const files = await readdir(join(contextsDir(root), 'Projects', 'Sapphire'))
    expect(files.filter((f) => f.endsWith('.md'))).toHaveLength(4)
  })

  it('fails on an unknown context id', async () => {
    const r = await createSpace(root, 'nope', 'X')
    expect(r.ok).toBe(false)
  })
})

describe('setPageContext', () => {
  const page = () => join(root, 'Notes', 'A.md')
  beforeEach(async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
  })

  it('writes the quoted bracketed key with titles resolved from ids (H-1)', async () => {
    await writeFile(page(), '---\nid: p1\n---\nbody')
    const r = await setPageContext(page(), await world(), '_tier3', ['sp-pom'])
    expect(r.ok).toBe(true)
    const content = await readFile(page(), 'utf8')
    expect(content).toContain('"[Projects]"')
    expect(splitFrontmatter(content)['[Projects]']).toEqual(['Pommora'])
    expect(content).toContain('body')
  })

  it('clears the key entirely on an empty list (A-5)', async () => {
    await writeFile(page(), '---\nid: p1\n"[Projects]":\n  - Pommora\n---\nbody')
    await setPageContext(page(), await world(), '_tier3', [])
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect('[Projects]' in fm).toBe(false)
  })

  it('reconciles sibling keys in place (D-9a/H-5)', async () => {
    await writeFile(
      page(),
      '---\nid: p1\n"[Projects]":\n  - pommora\n"[Classes]":\n  - cs 161\n  - Bogus\n---\nbody',
    )
    const r = await setPageContext(page(), await world(), 'ctxC', ['sp-cs'])
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Classes]']).toEqual(['CS 161'])
    expect(fm['[Projects]']).toEqual(['Pommora']) // untargeted sibling repaired on the same write
  })

  it('fails without writing when ANY space sidecar is unreadable (never strips siblings)', async () => {
    // An unreadable sibling sidecar (evicted cloud placeholder) must fail the world load —
    // a world missing that Space would make the reconcile drop its valid tags.
    await rm(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))
    await writeFile(page(), '---\nid: p1\n"[Projects]":\n  - Pommora\n---\nbody')
    const before = await readFile(page(), 'utf8')
    const w = await loadContextWorld(root)
    expect(w.ok).toBe(false)
    expect(await readFile(page(), 'utf8')).toBe(before)
  })

  it('fails on an unknown space id without writing', async () => {
    await writeFile(page(), '---\nid: p1\n---\nbody')
    const before = await readFile(page(), 'utf8')
    const r = await setPageContext(page(), await world(), '_tier3', ['nope'])
    expect(r.ok).toBe(false)
    expect(await readFile(page(), 'utf8')).toBe(before)
  })
})

describe('setAgendaContext + the agenda lock', () => {
  const task = () => join(root, 'Tasks', 'T.task.json')
  beforeEach(async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(
      task(),
      JSON.stringify({ id: 't1', '[Projects]': ['pommora'], foreign: true }),
    )
  })

  it('writes the bracketed key, repairs siblings, preserves foreign keys', async () => {
    const r = await setAgendaContext(task(), await world(), 'ctxC', ['sp-cs'])
    expect(r.ok).toBe(true)
    const raw = JSON.parse(await readFile(task(), 'utf8'))
    expect(raw['[Classes]']).toEqual(['CS 161'])
    expect(raw['[Projects]']).toEqual(['Pommora'])
    expect(raw.foreign).toBe(true)
  })

  it('concurrent agenda RMWs on one file serialize (no lost update)', async () => {
    await Promise.all([
      updateAgendaItem(task(), { priority: 5 }),
      updateAgendaProperty(task(), 'prop_x', { kind: 'url', value: 'https://x.dev' }),
    ])
    const raw = JSON.parse(await readFile(task(), 'utf8'))
    expect(raw.priority).toBe(5)
    expect(raw.properties.prop_x).toBeDefined()
  })
})

describe('setSpaceContext (G-1, cross-context)', () => {
  it('tags a Space into a different Context through its own sidecar', async () => {
    const r = await setSpaceContext(await world(), 'sp-pom', 'ctxC', ['sp-cs'])
    expect(r.ok).toBe(true)
    const sc = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), 'utf8'),
    )
    expect(sc['[Classes]']).toEqual(['CS 161'])
    expect(sc.id).toBe('sp-pom')
  })
})

describe('setSpaceColor', () => {
  it('accepts a chip solid, clears on undefined, rejects a non-solid', async () => {
    expect((await setSpaceColor(root, 'sp-pom', 'cyan')).ok).toBe(true)
    let sc = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), 'utf8'),
    )
    expect(sc.color).toBe('cyan')
    expect((await setSpaceColor(root, 'sp-pom', undefined)).ok).toBe(true)
    sc = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'), 'utf8'),
    )
    expect('color' in sc).toBe(false)
    expect((await setSpaceColor(root, 'sp-pom', 'magenta')).ok).toBe(false)
  })
})
