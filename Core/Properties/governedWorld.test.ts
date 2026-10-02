import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from './properties'
import * as liveTree from '../Nexus/liveTree'
import { assignedDefs, assignProperty, collectionFolders } from './assignment'
import { governedWorldOf } from '../Contexts/contextWrite'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from './registryProperty'
import { openSession } from '../Nexus/session'

let root: string
let notes: string
let statusId: string

beforeEach(async () => {
  root = tempRoot('pom-world-')
  await openSession(root)
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  const col = await createFolderEntity(root, 'collection', 'Notes', newId())
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

describe('governedWorldOf', () => {
  it('reads a page two Sets deep by its Collection’s definitions, and an Agenda page or a Space by none', async () => {
    const set = await createFolderEntity(notes, 'set', 'Daily', newId())
    if (!set.ok) throw new Error('setup')
    const inner = await createFolderEntity(set.value.path, 'set', 'Week', newId())
    if (!inner.ok) throw new Error('setup')
    const page = await createTestPage(inner.value.path, 'Deep', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    const names = async (file: string): Promise<string[]> => [
      ...(await governedWorldOf(root, file)).defs.keys(),
    ]
    expect(await names(page.value.path)).toEqual(['Status'])
    expect(await names(join(root, 'Tasks', 'T.md'))).toEqual([])
    expect(await names(join(root, '.nexus', 'contexts', 'Areas', 'Home', '_space.json'))).toEqual(
      [],
    )
  })
})

describe('collectionFolders', () => {
  it('never walks the disk while the live tree holds this root', async () => {
    await liveTree.refreshTree(root)
    const spy = vi.spyOn(liveTree, 'refreshTree')
    for (let i = 0; i < 10; i++) await collectionFolders(root)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
