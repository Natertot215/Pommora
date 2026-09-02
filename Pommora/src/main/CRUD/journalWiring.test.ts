// The record exists while pages are being swept, is gone once the op settles, and a refused
// op never leaves one behind.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PropertyDefinition } from '@shared/properties'
import {
  atomicWriteFile,
  rewritePageSerialized,
  rewritePreservingTimes,
  writeJson,
} from '../IO/atomicWrite'
import { closeSession, openSession } from '../session'
import { dropLiveTree } from '../liveTree'
import { listBundles } from '../provenance'
import { readRegistry } from '../IO/propertiesRegistry'
import { createProperty, editProperty } from './registryProperty'
import { deleteProperty } from './deleteProperty'
import { clearOption, removeOption, renameOption, setOptions } from './optionOps'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'

vi.mock('../IO/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../IO/atomicWrite')>()
  return {
    ...mod,
    atomicWriteFile: vi.fn(mod.atomicWriteFile),
    writeJson: vi.fn(mod.writeJson),
    rewritePageSerialized: vi.fn(mod.rewritePageSerialized),
    rewritePreservingTimes: vi.fn(mod.rewritePreservingTimes),
  }
})

let root: string
const journalFile = (): string => join(root, '.nexus', 'property-cascade.json')
const abs = (...segs: string[]): string => join(root, ...segs)

let observed: { path: string; journaled: boolean }[]

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'pom-jwire-')))
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
    '---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAA\nStage: Draft\n---\nbody\n',
  )
  await writeFile(
    abs('Col', 'B.md'),
    '---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAB\nStage: Draft\n---\nbody\n',
  )
  await openSession(root)
  observed = []
  const note = (path: string): void => {
    observed.push({ path, journaled: existsSync(journalFile()) })
  }
  const real = await vi.importActual<typeof import('../IO/atomicWrite')>('../IO/atomicWrite')
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
})
afterEach(async () => {
  vi.mocked(atomicWriteFile).mockRestore()
  vi.mocked(writeJson).mockRestore()
  vi.mocked(rewritePageSerialized).mockRestore()
  vi.mocked(rewritePreservingTimes).mockRestore()
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const pageWrites = (): { path: string; journaled: boolean }[] =>
  observed.filter((o) => o.path.endsWith('.md'))

describe('the rename writer', () => {
  it('holds the record across every page rewrite and clears on settle', async () => {
    const r = await editProperty(root, 'prop_s', { name: 'Phase' })
    expect(r.ok).toBe(true)
    const writes = pageWrites()
    expect(writes.length).toBe(2)
    expect(writes.every((w) => w.journaled)).toBe(true)
    expect(await readSchemaJournal(root)).toBeNull()
    expect(await readFile(abs('Col', 'A.md'), 'utf8')).toContain('Phase: Draft')
  })

  it('clears on a refused rename with no page touched', async () => {
    await createProperty(root, { id: 'prop_o', name: 'Other', type: 'select' })
    const r = await editProperty(root, 'prop_s', { name: 'Other' })
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
    // The bundle's writes ran journal-free; every page strip ran journaled.
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
      select_options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'Done', label: 'Done' },
      ],
    } as PropertyDefinition)
    await writeFile(
      abs('Col', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['prop_s', 'prop_t'] }),
    )
    await writeFile(
      abs('Col', 'C.md'),
      '---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAC\nTags:\n  - Draft\n---\nbody\n',
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

  it('option-clear never writes a record — its residue disagrees with nothing', async () => {
    await withOptions()
    const r = await clearOption(root, 'prop_t', 'Draft')
    expect(r.ok).toBe(true)
    expect(observed.some((o) => o.path === journalFile())).toBe(false)
    const def = (await readRegistry(root)).defs.prop_t
    expect(def?.select_options?.map((o) => o.value)).toEqual(['Draft', 'Done'])
    expect(await readFile(abs('Col', 'C.md'), 'utf8')).not.toContain('Tags: Draft')
  })

  it('setOptions never writes a record', async () => {
    await withOptions()
    await setOptions(root, 'prop_t', [{ value: 'Solo', label: 'Solo' }])
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

  it('a REFUSED create never spends the record it did not displace', async () => {
    // The crash state: the delete's def still stands, so a same-name create is a duplicate.
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_s', name: 'Stage' })
    const r = await createProperty(root, { id: '', name: 'Stage', type: 'select' })
    expect(r.ok).toBe(false)
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
