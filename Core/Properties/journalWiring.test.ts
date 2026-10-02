import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import type { PropertyDefinition } from './properties'
import {
  atomicWriteFile,
  editJsonStrict,
  rewritePageSerialized,
  rewritePreservingTimes,
  updateNexusConfig,
  writeJson,
} from '../Files/atomicWrite'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { listBundles } from '../Trash/holdings'
import { readRegistry } from './propertiesRegistry'
import { createProperty, editProperty, renameProperty } from './registryProperty'
import { deleteProperty } from './deleteProperty'
import { clearOption, editOption, removeOption, renameOption } from './optionOps'
import { clearSchemaJournal, readSchemaJournal, writeSchemaJournal } from './propertyJournal'

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return {
    ...mod,
    atomicWriteFile: vi.fn(mod.atomicWriteFile),
    editJsonStrict: vi.fn(mod.editJsonStrict),
    writeJson: vi.fn(mod.writeJson),
    rewritePageSerialized: vi.fn(mod.rewritePageSerialized),
    rewritePreservingTimes: vi.fn(mod.rewritePreservingTimes),
    updateNexusConfig: vi.fn(mod.updateNexusConfig),
  }
})

let root: string
const journalFile = (): string => join(root, '.nexus', 'property-cascade.json')
const abs = (...segs: string[]): string => join(root, ...segs)

let observed: { path: string; journaled: boolean }[]

beforeEach(async () => {
  root = tempRoot('pom-jwire-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(abs('.nexus', 'settings.json'), '{}')
  await mkdir(abs('Col'), { recursive: true })
  await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
  await writeFile(
    abs('Col', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  await writeFile(
    abs('Col', 'A.md'),
    '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAA\nStage: Draft\n---\nbody\n',
  )
  await writeFile(
    abs('Col', 'B.md'),
    '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAB\nStage: Draft\n---\nbody\n',
  )
  await openSession(root)
  observed = []
  const note = (path: string): void => {
    observed.push({ path, journaled: existsSync(journalFile()) })
  }
  const real = await vi.importActual<typeof import('../Files/atomicWrite')>('../Files/atomicWrite')
  vi.mocked(atomicWriteFile).mockImplementation(async (path, data) => {
    note(path)
    return real.atomicWriteFile(path, data)
  })
  vi.mocked(writeJson).mockImplementation(async (path, data) => {
    note(path)
    return real.writeJson(path, data)
  })
  vi.mocked(rewritePageSerialized).mockImplementation(async (path, fn) => {
    note(path)
    return real.rewritePageSerialized(path, fn)
  })
  vi.mocked(rewritePreservingTimes).mockImplementation(async (path, data) => {
    note(path)
    return real.rewritePreservingTimes(path, data)
  })
  vi.mocked(editJsonStrict).mockImplementation(async (path, mutate) => {
    const journaled = existsSync(journalFile())
    const outcome = await real.editJsonStrict(path, mutate)
    if (outcome === 'written') observed.push({ path, journaled })
    return outcome
  })
  vi.mocked(updateNexusConfig).mockImplementation(async (at, file, mutate) => {
    const journaled = existsSync(journalFile())
    let changed = false
    const r = await real.updateNexusConfig(at, file, (cur) => {
      const next = mutate(cur)
      changed = next !== null
      return next
    })
    if (r.ok && changed)
      observed.push({ path: nexusConfig(at, NEXUS_CONFIG_FILES[file]), journaled })
    return r
  })
})
afterEach(async () => {
  vi.mocked(atomicWriteFile).mockRestore()
  vi.mocked(writeJson).mockRestore()
  vi.mocked(rewritePageSerialized).mockRestore()
  vi.mocked(rewritePreservingTimes).mockRestore()
  vi.mocked(editJsonStrict).mockRestore()
  vi.mocked(updateNexusConfig).mockRestore()
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const pageWrites = (): { path: string; journaled: boolean }[] =>
  observed.filter((o) => o.path.endsWith('.md'))

describe('the rename writer', () => {
  it('holds the record across every page rewrite and clears on settle', async () => {
    const r = await renameProperty(root, 'prop_s', 'Phase')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBe(2)
    expect(writes.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
    expect(await readFile(abs('Col', 'A.md'), 'utf8')).toContain('Phase: Draft')
  })

  it('writes no record for a rename refused before the commit', async () => {
    await createProperty(root, { id: 'prop_o', name: 'Other', type: 'select' })
    const r = await renameProperty(root, 'prop_s', 'Other')
    expect(r.ok).toBe(false)
    expect(observed.some((o) => o.path === journalFile())).toBe(false)
  })

  it('clears the record when a create takes the name between the journal and the commit', async () => {
    const real =
      await vi.importActual<typeof import('../Files/atomicWrite')>('../Files/atomicWrite')
    let raced = false
    const race = async (path: string): Promise<void> => {
      if (path !== journalFile() || raced) return
      raced = true
      await createProperty(root, { id: 'prop_o', name: 'Other', type: 'select' })
    }
    vi.mocked(atomicWriteFile).mockImplementation(async (path, data) => {
      await real.atomicWriteFile(path, data)
      await race(path)
    })
    vi.mocked(writeJson).mockImplementation(async (path, data) => {
      await real.writeJson(path, data)
      await race(path)
    })
    const r = await renameProperty(root, 'prop_s', 'Other')
    expect(raced).toBe(true)
    expect(r.ok).toBe(false)
    expect(pageWrites().length).toBe(0)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('writes no record for a non-rename edit', async () => {
    const r = await editProperty(root, 'prop_s', { icon: 'tag' })
    expect(r.ok).toBe(true)
    expect(observed.some((o) => o.path === journalFile())).toBe(false)
  })
})

describe('the delete writer', () => {
  it('journals after the snapshot, holds across the strip, clears after the registry', async () => {
    const r = await deleteProperty(root, 'prop_s')
    expect(r.ok).toBe(true)
    const bundleWrites = observed.filter((o) => o.path.includes('.trash'))
    expect(bundleWrites.length).toBeGreaterThan(0)
    expect(bundleWrites.every((w) => !w.journaled)).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBe(2)
    expect(writes.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
    expect(await listBundles(root)).toHaveLength(1)
  })
})

describe('the option-op writers', () => {
  const withOptions = async (): Promise<void> => {
    await createProperty(root, {
      id: 'prop_t',
      name: 'Tags',
      type: 'select',
      select_options: [{ value: 'Draft' }, { value: 'Done' }],
    } as PropertyDefinition)
    await writeFile(
      abs('Col', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['prop_s', 'prop_t'] }),
    )
    await writeFile(
      abs('Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nTags:\n  - Draft\n---\nbody\n',
    )
    observed = []
  }

  it('option-rename holds the record across the cascade and clears on settle', async () => {
    await withOptions()
    const r = await renameOption(root, 'prop_t', 'Draft', 'Queued')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).toContain('- Queued')
  })

  it('a refused option-rename clears with no page touched', async () => {
    await withOptions()
    const r = await renameOption(root, 'prop_t', 'Draft', 'Done')
    expect(r.ok).toBe(false)
    expect(pageWrites().length).toBe(0)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('option-remove strips journaled, drops the option, and clears', async () => {
    await withOptions()
    const r = await removeOption(root, 'prop_t', 'Draft')
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBeGreaterThan(0)
    expect(writes.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
    const def = (await readRegistry(root)).defs.prop_t
    expect(def?.select_options?.map((o) => o.value)).toEqual(['Done'])
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).not.toContain('Tags: Draft')
  })

  it('option-remove writes every saved view while the record is held', async () => {
    await withOptions()
    await seedConfigSurfaces(root, abs('Col'), viewOn('prop_t', 'Draft'))
    await refreshTree(root)
    observed = []
    expect((await removeOption(root, 'prop_t', 'Draft')).ok).toBe(true)
    const configWrites = observed.filter((o) =>
      /_page(collection|set)\.json$|_tiles\.json$|matrix\.json$/.test(o.path),
    )
    expect(configWrites.map((o) => o.path.slice(root.length + 1)).sort()).toEqual([
      '.nexus/contexts/Areas/Home/_tiles.json',
      '.nexus/matrix.json',
      'Col/Deep/_pageset.json',
      'Col/_pagecollection.json',
    ])
    expect(configWrites.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('option-clear never writes a record — its residue disagrees with nothing', async () => {
    await withOptions()
    const r = await clearOption(root, 'prop_t', 'Draft')
    expect(r.ok).toBe(true)
    expect(observed.some((o) => o.path === journalFile())).toBe(false)
    const def = (await readRegistry(root)).defs.prop_t
    expect(def?.select_options?.map((o) => o.value)).toEqual(['Draft', 'Done'])
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).not.toContain('Tags: Draft')
  })

  it('editOption never writes a record', async () => {
    await withOptions()
    await editOption(root, 'prop_t', { op: 'add', groupId: 'select', title: 'Solo' })
    expect(observed.some((o) => o.path === journalFile())).toBe(false)
  })
})

describe('the create-side consumer', () => {
  it('a create wearing a journaled delete’s name consumes the record', async () => {
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_gone', name: 'Priority' })
    await createProperty(root, { id: '', name: 'Priority', type: 'select' })
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('a restore-shaped create wearing the journaled id consumes the record', async () => {
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_gone', name: 'Priority' })
    await createProperty(root, { id: 'prop_gone', name: 'Renamed Since', type: 'select' })
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('an unrelated create leaves the record standing', async () => {
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_gone', name: 'Priority' })
    await createProperty(root, { id: '', name: 'Unrelated', type: 'select' })
    expect(await readSchemaJournal(root)).toEqual({
      op: 'delete',
      id: 'prop_gone',
      name: 'Priority',
    })
  })

  it('a create stepped aside from the journaled name never spends the record it did not displace', async () => {
    // The crash state: the delete's def still stands, so a same-name create lands as Stage (2).
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_s', name: 'Stage' })
    const r = await createProperty(root, { id: '', name: 'Stage', type: 'select' })
    expect(r.ok).toBe(true)
    expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id: 'prop_s', name: 'Stage' })
  })
})

describe('the slot protects a stranded record', () => {
  it('an unrelated op neither displaces nor clears a held heal', async () => {
    // A rename record stranded by a prior faulted session, unrelated to any live op.
    await writeSchemaJournal(root, { op: 'rename', id: 'prop_x', from: 'Old', to: 'New' })
    const r = await deleteProperty(root, 'prop_s')
    expect(r.ok).toBe(true)
    expect(await readSchemaJournal(root)).toEqual({
      op: 'rename',
      id: 'prop_x',
      from: 'Old',
      to: 'New',
    })
  })
})

describe('the slot writes over nothing it cannot read', () => {
  const record = { op: 'rename', id: 'prop_x', from: 'Old', to: 'New' } as const

  it('an unreadable slot refuses a write and a clear', async () => {
    await mkdir(journalFile())
    await writeSchemaJournal(root, record)
    await clearSchemaJournal(root, record)
    expect((await stat(journalFile())).isDirectory()).toBe(true)
    expect(await readdir(journalFile())).toEqual([])
  })

  it.each([
    '{nope',
    '{ "op": "bogus", "id": "x" }',
  ])('a corrupt slot (%s) is set aside by the next write', async (bad) => {
    await writeFile(journalFile(), bad)
    await writeSchemaJournal(root, record)
    expect(await readSchemaJournal(root)).toEqual(record)
    const aside = (await readdir(abs('.nexus'))).filter((f) =>
      f.startsWith('.property-cascade.json.bad-'),
    )
    expect(aside).toHaveLength(1)
    expect(await readFile(abs('.nexus', aside[0]), 'utf8')).toBe(bad)
  })
})

describe('a second nexus', () => {
  it('sweeps and clears its own record while the session is open elsewhere', async () => {
    const other = tempRoot('pom-jwire2-')
    await mkdir(join(other, '.nexus'), { recursive: true })
    await writeFile(
      join(other, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx2', createdAt: 'x' }),
    )
    await writeFile(join(other, '.nexus', 'settings.json'), '{}')
    await mkdir(join(other, 'Col'), { recursive: true })
    await createProperty(other, { id: 'prop_s', name: 'Stage', type: 'select' })
    await writeFile(
      join(other, 'Col', '_pagecollection.json'),
      JSON.stringify({ id: 'c2', properties: ['prop_s'] }),
    )
    await writeFile(
      join(other, 'Col', 'A.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    const r = await renameProperty(other, 'prop_s', 'Phase')
    expect(r.ok).toBe(true)
    expect(await readFile(join(other, 'Col', 'A.md'), 'utf8')).toContain('Phase: Draft')
    expect(await readSchemaJournal(other)).toBeNull()
    await rm(other, { recursive: true, force: true })
  })
})
