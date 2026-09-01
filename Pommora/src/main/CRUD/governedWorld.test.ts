import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import * as liveTree from '../liveTree'
import { assignProperty, collectionFolderOf } from './assignment'
import { assignedDefs } from './contextWrite'
import { createFolderEntity } from './folderEntity'
import { createPage } from './page'
import { createProperty } from './registryProperty'

let root: string
let notes: string
let statusId: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-world-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  const col = await createFolderEntity(root, 'collection', 'Notes')
  if (!col.ok) throw new Error('setup')
  notes = col.value.path
  const status = await createProperty(root, {
    id: '',
    name: 'Status',
    type: 'select',
  } as PropertyDefinition)
  const priority = await createProperty(root, {
    id: '',
    name: 'Priority',
    type: 'number',
  } as PropertyDefinition)
  if (!status.ok || !priority.ok) throw new Error('setup')
  statusId = status.value.id
  await assignProperty(root, notes, statusId)
  await mkdir(join(root, 'Tasks'), { recursive: true })
  await writeFile(join(root, 'Tasks', '_taskconfig.json'), JSON.stringify({ id: 't1' }))
})
afterEach(async () => {
  liveTree.dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('assignedDefs', () => {
  it('names only what the Collection assigns; a null folder assigns nothing', async () => {
    const defs = await assignedDefs(root, notes)
    expect([...defs.keys()]).toEqual(['Status'])
    expect(defs.get('Status')?.id).toBe(statusId)
    expect((await assignedDefs(root, null)).size).toBe(0)
  })

  it('answers the same from the live tree as from disk', async () => {
    liveTree.dropLiveTree()
    const fromDisk = [...(await assignedDefs(root, notes)).keys()]
    await liveTree.refreshTree(root)
    const spy = vi.spyOn(liveTree, 'refreshTree')
    const fromTree = [...(await assignedDefs(root, notes)).keys()]
    expect(fromTree).toEqual(fromDisk)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('collectionFolderOf', () => {
  it('resolves a page two Sets deep to its Collection, and an Agenda page to null', async () => {
    const set = await createFolderEntity(notes, 'set', 'Daily')
    if (!set.ok) throw new Error('setup')
    const inner = await createFolderEntity(set.value.path, 'set', 'Week')
    if (!inner.ok) throw new Error('setup')
    const page = await createPage(inner.value.path, 'Deep', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    expect(await collectionFolderOf(root, page.value.path)).toBe(notes)
    expect(await collectionFolderOf(root, join(root, 'Tasks', 'T.md'))).toBeNull()
    expect(
      await collectionFolderOf(
        root,
        join(root, '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      ),
    ).toBeNull()
  })

  it('never walks the disk while the live tree holds this root', async () => {
    await liveTree.refreshTree(root)
    const spy = vi.spyOn(liveTree, 'refreshTree')
    for (let i = 0; i < 10; i++) await collectionFolderOf(root, join(notes, 'A.md'))
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
