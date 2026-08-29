import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createProperty,
  editProperty,
  removeFromRegistry,
  reorderRegistry,
} from './registryProperty'
import { assignProperty } from './assignment'
import { createFolderEntity } from './folderEntity'
import { createPage, updatePageProperty } from './page'
import { readRegistry } from '../IO/propertiesRegistry'
import { nexusConfig, NEXUS_CONFIG_FILES } from '../paths'
import type { PropertyDefinition } from '@shared/properties'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-regcrud-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const def = (
  over: Partial<PropertyDefinition> & { name: string; type: PropertyDefinition['type'] },
) => ({ id: '', ...over }) as PropertyDefinition

const registryFilePath = () => nexusConfig(root, NEXUS_CONFIG_FILES.properties)

describe('the registry file is never replaced by a failed read', () => {
  it('a mutation against an unreadable registry fails and writes nothing', async () => {
    const a = await createProperty(root, def({ name: 'Real', type: 'number' }))
    expect(a.ok).toBe(true)
    await writeFile(registryFilePath(), '{ corrupt', 'utf8')
    await expect(createProperty(root, def({ name: 'Casualty', type: 'number' }))).rejects.toThrow()
    expect(await readFile(registryFilePath(), 'utf8')).toBe('{ corrupt')
  })

  it('an entry that does not parse as a def rides through a write untouched', async () => {
    const a = await createProperty(root, def({ name: 'Real', type: 'number' }))
    if (!a.ok) throw new Error('setup failed')
    const raw = JSON.parse(await readFile(registryFilePath(), 'utf8'))
    raw.defs.prop_mystery = { garbage: true }
    await writeFile(registryFilePath(), JSON.stringify(raw), 'utf8')

    const b = await createProperty(root, def({ name: 'Another', type: 'number' }))
    expect(b.ok).toBe(true)
    const after = JSON.parse(await readFile(registryFilePath(), 'utf8'))
    expect(after.defs.prop_mystery).toEqual({ garbage: true }) // carried through, unmodeled
    expect((await readRegistry(root)).defs.prop_mystery).toBeUndefined() // readers skip it
  })
})

describe('createProperty', () => {
  it('mints a prop_ id, seeds status groups, and persists to the registry', async () => {
    const r = await createProperty(root, def({ name: 'Stage', type: 'status' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.id.startsWith('prop_')).toBe(true)
    const reg = await readRegistry(root)
    expect(reg.defs[r.value.id].status_groups?.map((g) => g.id)).toEqual([
      'upcoming',
      'in_progress',
      'done',
    ])
  })

  it('refuses a duplicate title, folding case — the title IS the key values write under', async () => {
    await createProperty(root, def({ name: 'Priority', type: 'select' }))
    expect((await createProperty(root, def({ name: 'priority', type: 'number' }))).ok).toBe(false)
  })

  it('refuses a leading $, which is reserved for system-assigned roles', async () => {
    expect((await createProperty(root, def({ name: '$Status', type: 'select' }))).ok).toBe(false)
    expect((await createProperty(root, def({ name: 'Budget ($)', type: 'number' }))).ok).toBe(true)
  })

  it('normalizes the stored name, so an untrimmed one can never reach a key', async () => {
    const r = await createProperty(root, def({ name: '  Spaced  ', type: 'number' }))
    expect(r.ok).toBe(true)
    if (r.ok) expect((await readRegistry(root)).defs[r.value.id]?.name).toBe('Spaced')
  })

  it('a blank name still rejects', async () => {
    expect((await createProperty(root, def({ name: '  ', type: 'number' }))).ok).toBe(false)
  })

  it('appends each new id to the nexus order (A-9)', async () => {
    const a = await createProperty(root, def({ name: 'One', type: 'number' }))
    const b = await createProperty(root, def({ name: 'Two', type: 'number' }))
    if (!a.ok || !b.ok) throw new Error('create failed')
    expect((await readRegistry(root)).order).toEqual([a.value.id, b.value.id])
  })

  it('serializes overlapping mutations — no lost update on the shared registry file', async () => {
    const results = await Promise.all([
      createProperty(root, def({ name: 'One', type: 'number' })),
      createProperty(root, def({ name: 'Two', type: 'number' })),
      createProperty(root, def({ name: 'Three', type: 'number' })),
    ])
    expect(results.every((r) => r.ok)).toBe(true)
    const reg = await readRegistry(root)
    expect(
      Object.values(reg.defs)
        .map((d) => d.name)
        .sort(),
    ).toEqual(['One', 'Three', 'Two'])
  })
})

describe('editProperty', () => {
  it('renames in place, keeping the id', async () => {
    const c = await createProperty(root, def({ name: 'Old', type: 'number' }))
    if (!c.ok) return
    expect((await editProperty(root, c.value.id, { name: 'New' })).ok).toBe(true)
    expect((await readRegistry(root)).defs[c.value.id].name).toBe('New')
  })

  it('refuses renaming onto a taken title, the same as creating one', async () => {
    await createProperty(root, def({ name: 'Alpha', type: 'number' }))
    const b = await createProperty(root, def({ name: 'Beta', type: 'number' }))
    if (!b.ok) return
    expect((await editProperty(root, b.value.id, { name: 'Alpha' })).ok).toBe(false)
    expect((await editProperty(root, b.value.id, { name: 'Gamma' })).ok).toBe(true)
  })

  it('sweeps every page, and one unparseable page never ends the walk', async () => {
    const c = await createProperty(root, def({ name: 'Old', type: 'number' }))
    if (!c.ok) return
    const col = await createFolderEntity(root, 'collection', 'Col')
    if (!col.ok) return
    await assignProperty(root, col.value.path, c.value.id)
    const live = (await readRegistry(root)).defs[c.value.id]
    const pages: string[] = []
    for (const title of ['A', 'B', 'C']) {
      const p = await createPage(col.value.path, title, { body: 'b' })
      if (!p.ok) return
      pages.push(p.value.path)
      await updatePageProperty(p.value.path, live, { kind: 'number', value: 1 })
    }
    // Hand-edited into unparseable YAML — an unterminated flow mapping. It sorts between the two
    // healthy pages, so a sweep that throws on it leaves C behind on the old key.
    await writeFile(pages[1], '---\ntitle: B\n<Old>: 1\nbroken: {oops\n---\nb\n', 'utf8')

    expect((await editProperty(root, c.value.id, { name: 'New' })).ok).toBe(true)
    for (const path of [pages[0], pages[2]]) {
      const content = await readFile(path, 'utf8')
      expect(content).toContain('<New>')
      expect(content).not.toContain('<Old>')
    }
    expect(await readFile(pages[1], 'utf8')).toContain('broken: {oops') // left exactly as found
  })

  it('writes and then clears a checkbox property color in place', async () => {
    const c = await createProperty(root, def({ name: 'Done', type: 'checkbox' }))
    if (!c.ok) return
    await editProperty(root, c.value.id, { checkbox_color: 'blue' })
    expect((await readRegistry(root)).defs[c.value.id].checkbox_color).toBe('blue')
    await editProperty(root, c.value.id, { checkbox_color: undefined })
    expect((await readRegistry(root)).defs[c.value.id].checkbox_color).toBeUndefined()
  })
})

describe('removeFromRegistry', () => {
  it('drops the def AND its order entry — no dangling id on disk', async () => {
    const c = await createProperty(root, def({ name: 'Temp', type: 'number' }))
    if (!c.ok) return
    expect((await removeFromRegistry(root, c.value.id)).ok).toBe(true)
    expect(await readRegistry(root)).toEqual({ order: [], defs: {} })
    const raw = JSON.parse(await readFile(join(root, '.nexus', 'properties.json'), 'utf8'))
    expect(raw.order).toEqual([]) // the write-side filter, not the lenient read, cleans it
  })
})

describe('reorderRegistry', () => {
  it('moves an id within the nexus order (C-1)', async () => {
    const ids: string[] = []
    for (const name of ['One', 'Two', 'Three']) {
      const r = await createProperty(root, def({ name, type: 'number' }))
      if (r.ok) ids.push(r.value.id)
    }
    expect((await reorderRegistry(root, ids[2], 0)).ok).toBe(true)
    expect((await readRegistry(root)).order).toEqual([ids[2], ids[0], ids[1]])
  })

  it('clamps an out-of-range index and rejects an unknown id', async () => {
    const a = await createProperty(root, def({ name: 'Only', type: 'number' }))
    if (!a.ok) return
    expect((await reorderRegistry(root, a.value.id, 99)).ok).toBe(true)
    expect((await reorderRegistry(root, 'prop_ghost', 0)).ok).toBe(false)
  })
})
