import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { updatePageProperty } from '../Testing/propertyWrites'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, seedSpaceSidecar, tempRoot } from '../Testing/hostFs'
import {
  createProperty,
  editProperty,
  renameProperty,
  removeFromRegistry,
  reorderRegistry,
} from './registryProperty'
import { assignProperty } from './assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { pathExists } from '../Files/atomicWrite'
import { readRegistry } from './propertiesRegistry'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { nexusConfig, nexusDir } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import type { PropertyDraft } from './properties'

vi.mock('./propertyJournal', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertyJournal')>()
  return { ...mod, writeSchemaJournal: vi.fn(mod.writeSchemaJournal) }
})

type RegistryFile = { order: string[]; defs: Record<string, unknown> }

let root: string
beforeEach(async () => {
  root = tempRoot('pom-regcrud-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const def = (over: Partial<PropertyDraft> & { label: string; type: PropertyDraft['type'] }) =>
  ({ id: '', ...over }) as PropertyDraft

const registryFilePath = () => nexusConfig(root, NEXUS_CONFIG_FILES.properties)

const seedRegistry = async (stored: { id: string } & Record<string, unknown>) => {
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    registryFilePath(),
    JSON.stringify({ order: [stored.id], defs: { [stored.id]: stored } }),
  )
}

describe('the registry file is never replaced by a failed read', () => {
  it('a mutation against an unreadable registry fails and writes nothing', async () => {
    const a = await createProperty(root, def({ label: 'Real', type: 'number' }))
    expect(a.ok).toBe(true)
    await writeFile(registryFilePath(), '{ corrupt', 'utf8')
    await expect(createProperty(root, def({ label: 'Casualty', type: 'number' }))).rejects.toThrow()
    expect(await readFile(registryFilePath(), 'utf8')).toBe('{ corrupt')
  })

  it('an entry that does not parse as a def rides through a write untouched', async () => {
    const a = await createProperty(root, def({ label: 'Real', type: 'number' }))
    if (!a.ok) throw new Error('setup failed')
    const raw = await readJsonAt<RegistryFile>(registryFilePath())
    raw.defs.prop_mystery = { garbage: true }
    await writeFile(registryFilePath(), JSON.stringify(raw), 'utf8')

    const b = await createProperty(root, def({ label: 'Another', type: 'number' }))
    expect(b.ok).toBe(true)
    const after = await readJsonAt<RegistryFile>(registryFilePath())
    expect(after.defs.prop_mystery).toEqual({ garbage: true })
    expect((await readRegistry(root)).defs.prop_mystery).toBeUndefined()
  })
})

describe('createProperty', () => {
  it('writes the landed label as both the label and the key', async () => {
    const r = await createProperty(root, { id: '', label: 'Priority', type: 'number' })
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Priority',
      key: 'Priority',
    })
  })

  it('writes the key from the landed label through the Key Format', async () => {
    const r = await createProperty(root, {
      id: '',
      label: 'Due Date',
      type: 'dateTime',
      key_format: 'snake_case',
    })
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Due Date',
      key: 'due_date',
      key_format: 'snake_case',
    })
  })

  it('steps a held label aside and writes the stepped label through the Key Format', async () => {
    await createProperty(root, def({ label: 'Name', type: 'text' }))
    const r = await createProperty(
      root,
      def({ label: 'Name', type: 'text', key_format: 'kebab-case' }),
    )
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Name (2)',
      key: 'name-(2)',
    })
  })

  it('steps the label aside while the key its format writes is held', async () => {
    await seedRegistry({ id: 'prop_d', label: 'Due', key: 'due_date', type: 'text' })
    const r = await createProperty(
      root,
      def({ label: 'Due Date', type: 'text', key_format: 'snake_case' }),
    )
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Due Date (2)',
      key: 'due_date_(2)',
    })
  })

  it('keeps a label another definition holds only as its key', async () => {
    await seedRegistry({ id: 'prop_x', label: 'X', key: 'due date', type: 'text' })
    const r = await createProperty(
      root,
      def({ label: 'Due Date', type: 'text', key_format: 'kebab-case' }),
    )
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Due Date',
      key: 'due-date',
    })
  })

  it('steps a label aside whose key folds onto a held key', async () => {
    await seedRegistry({ id: 'prop_p', label: 'Phase', key: 'stage', type: 'text' })
    const r = await createProperty(root, def({ label: 'Stage', type: 'text' }))
    if (!r.ok) throw new Error('create failed')
    expect((await readRegistry(root)).defs[r.value.id]).toMatchObject({
      label: 'Stage (2)',
      key: 'Stage (2)',
    })
  })

  it('mints a prop_ id, seeds status groups, and persists to the registry', async () => {
    const r = await createProperty(root, def({ label: 'Stage', type: 'status' }))
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

  it('steps a taken title aside, folding case — the title IS the key values write under', async () => {
    await createProperty(root, def({ label: 'Priority', type: 'select' }))
    const r = await createProperty(root, def({ label: 'priority', type: 'number' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((await readRegistry(root)).defs[r.value.id].label).toBe('priority (2)')
  })

  it('refuses a leading $, which is reserved for system-assigned roles', async () => {
    expect((await createProperty(root, def({ label: '$Status', type: 'select' }))).ok).toBe(false)
    expect((await createProperty(root, def({ label: 'Budget ($)', type: 'number' }))).ok).toBe(true)
  })

  it('refuses a name Pommora manages as a page key, on create and on rename', async () => {
    const created = await createProperty(root, def({ label: 'Banner', type: 'dateTime' }))
    expect(created.ok).toBe(false)
    if (!created.ok) expect(created.error.message).toContain('Banner')
    const ok = await createProperty(root, def({ label: 'Due', type: 'dateTime' }))
    if (!ok.ok) return
    expect((await renameProperty(root, ok.value.id, 'Banner')).ok).toBe(false)
    expect((await renameProperty(root, ok.value.id, '<Due>')).ok).toBe(false)
  })

  it('normalizes the stored name, so an untrimmed one can never reach a key', async () => {
    const r = await createProperty(root, def({ label: '  Spaced  ', type: 'number' }))
    expect(r.ok).toBe(true)
    if (r.ok) expect((await readRegistry(root)).defs[r.value.id]?.label).toBe('Spaced')
  })

  it('a blank name still rejects', async () => {
    expect((await createProperty(root, def({ label: '  ', type: 'number' }))).ok).toBe(false)
  })

  it('appends each new id to the nexus order (A-9)', async () => {
    const a = await createProperty(root, def({ label: 'One', type: 'number' }))
    const b = await createProperty(root, def({ label: 'Two', type: 'number' }))
    if (!a.ok || !b.ok) throw new Error('create failed')
    expect((await readRegistry(root)).order).toEqual([a.value.id, b.value.id])
  })

  it('serializes overlapping mutations — no lost update on the shared registry file', async () => {
    const results = await Promise.all([
      createProperty(root, def({ label: 'One', type: 'number' })),
      createProperty(root, def({ label: 'Two', type: 'number' })),
      createProperty(root, def({ label: 'Three', type: 'number' })),
    ])
    expect(results.every((r) => r.ok)).toBe(true)
    const reg = await readRegistry(root)
    expect(
      Object.values(reg.defs)
        .map((d) => d.label)
        .sort(),
    ).toEqual(['One', 'Three', 'Two'])
  })
})

describe('renameProperty and editProperty', () => {
  it('renames in place, keeping the id', async () => {
    const c = await createProperty(root, def({ label: 'Old', type: 'number' }))
    if (!c.ok) return
    expect((await renameProperty(root, c.value.id, 'New')).ok).toBe(true)
    expect((await readRegistry(root)).defs[c.value.id].label).toBe('New')
  })

  it('adopts a key a Collection page already holds, its value going live under the property', async () => {
    const c = await createProperty(root, def({ label: 'New Text', type: 'text' }))
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!c.ok || !col.ok) return
    await assignProperty(root, col.value.path, c.value.id)
    const p = await createTestPage(col.value.path, 'Holder', { body: 'b' })
    if (!p.ok) return
    const held = `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nDescription: a page about bars\n---\nb\n`
    await writeFile(p.value.path, held)

    expect((await renameProperty(root, c.value.id, 'Description')).ok).toBe(true)
    expect((await readRegistry(root)).defs[c.value.id].label).toBe('Description')
    expect(await readFile(p.value.path, 'utf8')).toBe(held)
  })

  it('a change of case alone moves the key on every holder and clears the journal', async () => {
    const c = await createProperty(root, def({ label: 'Status', type: 'select' }))
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!c.ok || !col.ok) return
    await assignProperty(root, col.value.path, c.value.id)
    const p = await createTestPage(col.value.path, 'Holder', { body: 'b' })
    if (!p.ok) return
    await writeFile(p.value.path, `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nStatus: Active\n---\nb\n`)
    const space = await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Status: 'x' })
    const other = await seedSpaceSidecar(root, 'Projects', 'Sapphire', { id: 'sp2', status: 'x' })
    const otherBytes = await readFile(other, 'utf8')

    expect((await renameProperty(root, c.value.id, 'STATUS')).ok).toBe(true)
    expect((await readRegistry(root)).defs[c.value.id].label).toBe('STATUS')
    expect(await readFile(p.value.path, 'utf8')).toBe(
      `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nSTATUS: Active\n---\nb\n`,
    )
    expect(await readJsonAt(space)).toEqual({ id: 'sp1', STATUS: 'x' })
    expect(await readFile(other, 'utf8')).toBe(otherBytes)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('a rename onto its own key writes the label alone, journaling and sweeping nothing', async () => {
    const c = await createProperty(root, def({ label: 'Status', type: 'select' }))
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!c.ok || !col.ok) throw new Error('setup failed')
    await assignProperty(root, col.value.path, c.value.id)
    const p = await createTestPage(col.value.path, 'Holder', { body: 'b' })
    if (!p.ok) throw new Error('setup failed')
    const held = `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nstatus: Open\n---\nb\n`
    await writeFile(p.value.path, held)
    const registry = await readJsonAt<RegistryFile>(registryFilePath())
    const stored = registry.defs[c.value.id] as Record<string, unknown>
    registry.defs[c.value.id] = { ...stored, key: 'status' }
    await writeFile(registryFilePath(), JSON.stringify(registry))
    vi.mocked(writeSchemaJournal).mockClear()

    const renamed = await renameProperty(root, c.value.id, 'status')
    expect(renamed.ok && renamed.value).toMatchObject({ from: 'status', to: 'status' })
    expect((await readRegistry(root)).defs[c.value.id]).toMatchObject({
      label: 'status',
      key: 'status',
    })
    expect(writeSchemaJournal).not.toHaveBeenCalled()
    expect(await readSchemaJournal(root)).toBeNull()
    expect(await readFile(p.value.path, 'utf8')).toBe(held)
  })

  it('refuses a rename onto a key a file holds beside the old one, and stages no journal', async () => {
    const c = await createProperty(root, def({ label: 'Status', type: 'select' }))
    if (!c.ok) return
    const file = await seedSpaceSidecar(root, 'Projects', 'Pommora', {
      id: 'sp1',
      Status: ['Active'],
      Stage: ['Hand-written'],
    })

    const refused = await renameProperty(root, c.value.id, 'Stage')
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.error.message).toBe('1 Item holds both "Status" and "Stage".')
    expect(await pathExists(join(root, '.nexus', 'property-cascade.json'))).toBe(false)
    expect(await readJsonAt(file)).toEqual({
      id: 'sp1',
      Status: ['Active'],
      Stage: ['Hand-written'],
    })
  })

  it('refuses renaming onto a taken title, the same as creating one', async () => {
    await createProperty(root, def({ label: 'Alpha', type: 'number' }))
    const b = await createProperty(root, def({ label: 'Beta', type: 'number' }))
    if (!b.ok) return
    expect((await renameProperty(root, b.value.id, 'Alpha')).ok).toBe(false)
    expect((await renameProperty(root, b.value.id, 'Gamma')).ok).toBe(true)
  })

  it('sweeps every page, and one unparseable page never ends the walk', async () => {
    const c = await createProperty(root, def({ label: 'Old', type: 'number' }))
    if (!c.ok) return
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) return
    await assignProperty(root, col.value.path, c.value.id)
    const live = (await readRegistry(root)).defs[c.value.id]
    const pages: string[] = []
    for (const title of ['A', 'B', 'C']) {
      const p = await createTestPage(col.value.path, title, { body: 'b' })
      if (!p.ok) return
      pages.push(p.value.path)
      await updatePageProperty(p.value.path, live, { kind: 'number', value: 1 })
    }
    // Hand-edited into unparseable YAML. It sorts between the two healthy pages, so a sweep that throws on it leaves C behind on the old key.
    await writeFile(pages[1], '---\ntitle: B\nOld: 1\nbroken: {oops\n---\nb\n', 'utf8')

    expect((await renameProperty(root, c.value.id, 'New')).ok).toBe(true)
    for (const path of [pages[0], pages[2]]) {
      const content = await readFile(path, 'utf8')
      expect(content).toContain('New: 1')
      expect(content).not.toContain('Old:')
    }
    expect(await readFile(pages[1], 'utf8')).toContain('broken: {oops')
  })

  it('writes and then clears a checkbox property color in place', async () => {
    const c = await createProperty(root, def({ label: 'Done', type: 'checkbox' }))
    if (!c.ok) return
    await editProperty(root, c.value.id, { checkbox_color: 'blue' })
    expect((await readRegistry(root)).defs[c.value.id].checkbox_color).toBe('blue')
    await editProperty(root, c.value.id, { checkbox_color: undefined })
    expect((await readRegistry(root)).defs[c.value.id].checkbox_color).toBeUndefined()
  })
})

describe('removeFromRegistry', () => {
  it('drops the def AND its order entry — no dangling id on disk', async () => {
    const c = await createProperty(root, def({ label: 'Temp', type: 'number' }))
    if (!c.ok) return
    expect((await removeFromRegistry(root, c.value.id)).ok).toBe(true)
    expect(await readRegistry(root)).toEqual({ order: [], defs: {} })
    const raw = await readJsonAt(join(root, '.nexus', 'properties.json'))
    expect(raw.order).toEqual([])
  })
})

describe('reorderRegistry', () => {
  it('moves an id within the nexus order (C-1)', async () => {
    const ids: string[] = []
    for (const name of ['One', 'Two', 'Three']) {
      const r = await createProperty(root, def({ label: name, type: 'number' }))
      if (r.ok) ids.push(r.value.id)
    }
    expect((await reorderRegistry(root, ids[2], 0)).ok).toBe(true)
    expect((await readRegistry(root)).order).toEqual([ids[2], ids[0], ids[1]])
  })

  it('clamps an out-of-range index and rejects an unknown id', async () => {
    const a = await createProperty(root, def({ label: 'Only', type: 'number' }))
    if (!a.ok) return
    expect((await reorderRegistry(root, a.value.id, 99)).ok).toBe(true)
    expect((await reorderRegistry(root, 'prop_ghost', 0)).ok).toBe(false)
  })
})
