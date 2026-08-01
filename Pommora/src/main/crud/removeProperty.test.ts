import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { removeProperty } from './removeProperty'
import { assignProperty } from './assignment'
import { createProperty, editProperty } from './registryProperty'
import { createFolderEntity } from './folderEntity'
import { createPage, updatePageProperty } from './page'
import { readSidecar } from '../sidecarIO'
import { readFrontmatterFields } from '../io/pageFile'
import { pageCollectionSidecar } from '@shared/schemas'
import type { PropertyDefinition } from '@shared/properties'
import { wrapKey } from '@shared/governedKeys'

let root: string
let folder: string
let liveDef: PropertyDefinition
let propId: string
let pageA: string
let pageB: string

const stageDef = {
  id: '',
  name: 'Stage',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'To-do',
      color: 'gray',
      options: [{ value: 'active', label: 'Active', group_id: 'upcoming' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'done', label: 'Done', group_id: 'done' }],
    },
  ],
} as PropertyDefinition

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-remove-'))
  const c = await createFolderEntity(root, 'collection', 'Notes')
  const p = await createProperty(root, stageDef)
  if (!c.ok || !p.ok) throw new Error('setup failed')
  folder = c.value.path
  propId = p.value.id
  liveDef = { ...stageDef, id: propId } as PropertyDefinition
  await assignProperty(root, folder, propId)
  const a = await createPage(folder, 'A', { body: 'b' })
  const b = await createPage(folder, 'B', { body: 'b' })
  if (!a.ok || !b.ok) throw new Error('setup failed')
  pageA = a.value.path
  pageB = b.value.path
  await updatePageProperty(pageA, liveDef, { kind: 'select', value: 'active' })
  await updatePageProperty(pageB, liveDef, { kind: 'select', value: 'done' })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** The value a page holds for the property under test, read at its own key. */
const pageValue = async (path: string): Promise<unknown> =>
  (readFrontmatterFields(await readFile(path, 'utf8')) as Record<string, unknown>)[
    wrapKey('property', liveDef.name)
  ]
const sidecar = async (): Promise<Record<string, unknown> | null> =>
  (await readSidecar(folder, 'collection', pageCollectionSidecar)) as Record<string, unknown> | null
const cacheBlock = async (): Promise<{ values: Record<string, unknown> } | undefined> =>
  (
    (await sidecar())?.property_cache as
      | Record<string, { values: Record<string, unknown> }>
      | undefined
  )?.[propId]

describe('removeProperty — strip + cache (C-3/C-6)', () => {
  it('strips the value from every member page, caches {pageId: raw}, and unassigns — one transaction', async () => {
    const r = await removeProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toBeUndefined()
    const sc = await sidecar()
    expect((sc?.properties as string[] | undefined) ?? []).not.toContain(propId)
    const block = await cacheBlock()
    // The block is the values map and nothing else — no timestamp field rides along.
    expect(Object.keys(block ?? {})).toEqual(['values'])
    const vals = Object.values(block?.values ?? {})
    expect(vals).toHaveLength(2)
    expect(vals).toEqual(expect.arrayContaining(['active', 'done']))
  })

  // Remove exists to CLEAR a value; identity only decides whether it can be handed back. A page
  // carrying no identity key must still be stripped, or Remove leaks the very value it ran to
  // clear — and it must not be cached under a synthetic id it would never be found by again.
  it('strips an identity-less page too, caching nothing for it', async () => {
    const raw = await readFile(pageA, 'utf8')
    await writeFile(pageA, raw.replace(new RegExp(`^${PAGE_ID_KEY}:.*\\n`, 'm'), ''))
    expect(await pageValue(pageA)).toBe('active') // still holds the value, just no identity

    const r = await removeProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toBeUndefined() // stripped regardless
    expect(await pageValue(pageB)).toBeUndefined()
    const vals = Object.values((await cacheBlock())?.values ?? {})
    expect(vals).toEqual(['done']) // only the identified page is restorable
  })

  it('is a no-op when the property is not assigned — never overwrites a cache with emptiness (E-6)', async () => {
    await removeProperty(root, folder, propId)
    const before = await cacheBlock()
    const again = await removeProperty(root, folder, propId)
    expect(again.ok).toBe(true)
    expect(await cacheBlock()).toEqual(before)
  })
})

describe('restore on re-assign — per-value schema-currency reconciliation (C-3)', () => {
  it('restores cached values to pages still present and clears the block', async () => {
    await removeProperty(root, folder, propId)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toBe('active')
    expect(await pageValue(pageB)).toBe('done')
    expect(await cacheBlock()).toBeUndefined()
    expect((await sidecar())?.properties).toContain(propId)
  })

  it('a value whose option no longer exists stays cached; conforming siblings restore', async () => {
    await removeProperty(root, folder, propId)
    await editProperty(root, propId, {
      status_groups: [
        {
          id: 'done',
          label: 'Done',
          color: 'green',
          options: [{ value: 'done', label: 'Done', group_id: 'done' }],
        },
      ],
    } as Partial<PropertyDefinition>)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toBeUndefined() // 'active' is no longer a live option
    expect(await pageValue(pageB)).toBe('done')
    // The entry leaves the cache only by restoring — a rejected value waits for its option
    // to come back rather than being spent on a restore that never happened.
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(1)
    expect(Object.values(block.values)).toEqual(['active'])
  })

  it('a value whose def type changed stays cached, restoring nothing', async () => {
    await removeProperty(root, folder, propId)
    await editProperty(root, propId, { type: 'number' })
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toBeUndefined()
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(2)
  })

  it('a page deleted while cached is skipped — its entry stays cached, no error', async () => {
    await removeProperty(root, folder, propId)
    await rm(pageA)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageB)).toBe('done')
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(1)
  })

  it('restores select values whose STRINGS look like dates or URLs — type-directed, never shape-inferred (breaker H-1)', async () => {
    const sel = await createProperty(root, {
      id: '',
      name: 'Milestone',
      type: 'select',
      select_options: [
        { value: '2024-01-01', label: 'Kickoff' },
        { value: 'https://acme.io', label: 'Site' },
        { value: 'note:draft', label: 'Draft' },
      ],
    } as PropertyDefinition)
    if (!sel.ok) throw new Error('setup failed')
    const id = sel.value.id
    await assignProperty(root, folder, id)
    const c = await createPage(folder, 'C', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const selDef = { ...sel.value, id } as PropertyDefinition
    await updatePageProperty(c.value.path, selDef, { kind: 'select', value: '2024-01-01' })
    await removeProperty(root, folder, id)
    await assignProperty(root, folder, id)
    const root2 = readFrontmatterFields(await readFile(c.value.path, 'utf8')) as Record<
      string,
      unknown
    >
    expect(root2[wrapKey('property', selDef.name)]).toBe('2024-01-01')
  })

  it('a member page without an id still gets STRIPPED on Remove — only the caching needs identity (breaker L-2)', async () => {
    const orphan = join(folder, 'Orphan.md')
    await writeFile(orphan, `---\n${wrapKey('property', liveDef.name)}: active\n---\n\nbody\n`)
    await removeProperty(root, folder, propId)
    expect(await pageValue(orphan)).toBeUndefined()
  })
})
