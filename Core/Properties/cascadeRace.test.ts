// The cascade and the cell-write path must serialize on the SAME per-file lock. They match only because openSession canonicalizes the root — on a symlinked-root ancestry (a macOS tmpdir IS /var→/private/var) a raw sessionRoot would split them into different buckets.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { renameOption } from './optionOps'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage, updatePageProperty } from '../Nexus/page'
import { machine } from '../Platform/machine'
import { openSession, closeSession, sessionRoot } from '../Nexus/session'
import { resolveUnderRoot } from '../Paths/pathSafety'
import type { PropertyDefinition, PropertyType } from './properties'

const defOf = (id: string, type: PropertyType = 'select'): PropertyDefinition => ({
  id,
  name: 'P',
  type,
})

let rawRoot: string
beforeEach(async () => {
  rawRoot = await mkdtemp(join(tmpdir(), 'pom-race-'))
})
afterEach(async () => {
  closeSession()
  await rm(rawRoot, { recursive: true, force: true })
})

async function setup(root: string, value: string): Promise<{ propertyId: string; rel: string }> {
  const c = await createProperty(root, {
    id: '',
    name: 'P',
    type: 'select',
    select_options: [{ value, label: value }],
  } as PropertyDefinition)
  if (!c.ok) throw new Error('createProperty failed')
  const col = await createFolderEntity(root, 'collection', 'Col')
  if (!col.ok) throw new Error('collection failed')
  await assignProperty(root, col.value.path, c.value.id)
  const p = await createPage(col.value.path, 'Target', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  await updatePageProperty(root, p.value.path, defOf(c.value.id), { kind: 'select', value })
  return { propertyId: c.value.id, rel: relative(root, p.value.path) }
}

describe('F1 — the cascade takes the cell-write lock', () => {
  it('a rename cascade queues behind an in-flight cell-write on the same page', async () => {
    await openSession(rawRoot) // canonicalizes the root
    const root = sessionRoot()!
    const { propertyId, rel } = await setup(root, 'old')
    // The exact key the real setProperty locks on (mutate.ts → resolveUnderRoot → realpath'd).
    const key = await resolveUnderRoot(root, rel)
    if (!key.ok) throw new Error('resolve failed')

    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    // Occupy the page's file lock with a gated cell-write: keyed off a different path string, the cascade would land in another bucket and slip past.
    const held = machine().lock(key.value, async () => {
      await gate
      order.push('cell-write')
    })
    const cascade = renameOption(root, propertyId, 'old', 'new').then(() => order.push('cascade'))
    await new Promise((r) => setTimeout(r, 50))
    release()
    await Promise.all([held, cascade])
    expect(order).toEqual(['cell-write', 'cascade'])
  })
})
