import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdir, rm, stat } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import { createFolderEntity, renameFolderEntity } from './folderEntity'
import { newId } from './ids'
import { readSidecar } from '../Files/sidecar'
import { baseSidecar, pageCollectionSidecar } from './schemas'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-crud-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('createFolderEntity', () => {
  it('creates a folder + sidecar under the given ID (one factory for all kinds)', async () => {
    const id = newId()
    const r = await createFolderEntity(root, 'space', 'Health', id, {
      icon: 'folder',
      color: 'green',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(await readSidecar(r.value.path, 'space', baseSidecar)).toMatchObject({
      id,
      icon: 'folder',
      color: 'green',
    })
  })

  it('rejects a duplicate name', async () => {
    await createFolderEntity(root, 'collection', 'Notes', newId())
    expect((await createFolderEntity(root, 'collection', 'Notes', newId())).ok).toBe(false)
  })

  it('gives two same-name creates at the same moment one folder each', async () => {
    const both = await Promise.all([
      createFolderEntity(root, 'collection', 'Weekly', newId()),
      createFolderEntity(root, 'collection', 'Weekly', newId()),
    ])
    expect(both.map((r) => r.ok).sort()).toEqual([false, true])
  })

  it('rejects unsafe names', async () => {
    expect((await createFolderEntity(root, 'collection', 'a/b', newId())).ok).toBe(false)
    expect((await createFolderEntity(root, 'collection', '..', newId())).ok).toBe(false)
    expect((await createFolderEntity(root, 'collection', '   ', newId())).ok).toBe(false)
  })

  it('rejects a title carrying a period, which reads as a file and can shadow a config leaf', async () => {
    expect((await createFolderEntity(root, 'collection', 'Q3.2025', newId())).ok).toBe(false)
    expect((await createFolderEntity(root, 'set', 'crops.json', newId())).ok).toBe(false)
  })
})

describe('renameFolderEntity', () => {
  it('renames the folder, carrying the sidecar', async () => {
    const id = newId()
    const c = await createFolderEntity(root, 'collection', 'Old', id)
    if (!c.ok) throw new Error('setup failed')
    const r = await renameFolderEntity(root, c.value.path, 'New')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('New')).toBe(true)
    await expect(stat(c.value.path)).rejects.toThrow()
    expect(await readSidecar(r.value.path, 'collection', pageCollectionSidecar)).toMatchObject({
      id,
    })
  })

  it('is a no-op when the name is unchanged', async () => {
    const c = await createFolderEntity(root, 'collection', 'Same', newId())
    if (!c.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(root, c.value.path, 'Same')).ok).toBe(true)
  })

  it('rejects renaming onto an existing name', async () => {
    const a = await createFolderEntity(root, 'collection', 'A', newId())
    await createFolderEntity(root, 'collection', 'B', newId())
    if (!a.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(root, a.value.path, 'B')).ok).toBe(false)
  })

  it('lands a case-only rename', async () => {
    const c = await createFolderEntity(root, 'collection', 'notes', newId())
    if (!c.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(root, c.value.path, 'Notes')).ok).toBe(true)
    expect(await readdir(root)).toEqual(['Notes'])
  })
})
