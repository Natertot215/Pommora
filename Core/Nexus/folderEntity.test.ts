import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdir, rm, stat } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import { createFolderEntity, renameFolderEntity } from './folderEntity'
import { readSidecar } from '../Files/sidecar'
import { baseSidecar, pageCollectionSidecar } from './schemas'
import { isUlid } from './ids'

let root: string
beforeEach(async () => {
  root = tempRoot('pom-crud-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('createFolderEntity', () => {
  it('creates a folder + sidecar with a fresh ULID (one factory for all kinds)', async () => {
    const r = await createFolderEntity(root, 'space', 'Health', { icon: 'folder', color: 'green' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(isUlid(r.value.id)).toBe(true)
    expect(await readSidecar(r.value.path, 'space', baseSidecar)).toMatchObject({
      id: r.value.id,
      icon: 'folder',
      color: 'green',
    })
  })

  it('rejects a duplicate name', async () => {
    await createFolderEntity(root, 'collection', 'Notes')
    expect((await createFolderEntity(root, 'collection', 'Notes')).ok).toBe(false)
  })

  it('rejects unsafe names', async () => {
    expect((await createFolderEntity(root, 'collection', 'a/b')).ok).toBe(false)
    expect((await createFolderEntity(root, 'collection', '..')).ok).toBe(false)
    expect((await createFolderEntity(root, 'collection', '   ')).ok).toBe(false)
  })

  it('rejects a title carrying a period, which reads as a file and can shadow a config leaf', async () => {
    expect((await createFolderEntity(root, 'collection', 'Q3.2025')).ok).toBe(false)
    expect((await createFolderEntity(root, 'set', 'crops.json')).ok).toBe(false)
  })
})

describe('renameFolderEntity', () => {
  it('renames the folder, carrying the sidecar', async () => {
    const c = await createFolderEntity(root, 'collection', 'Old')
    if (!c.ok) throw new Error('setup failed')
    const r = await renameFolderEntity(c.value.path, 'New')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('New')).toBe(true)
    await expect(stat(c.value.path)).rejects.toThrow()
    expect(await readSidecar(r.value.path, 'collection', pageCollectionSidecar)).toMatchObject({
      id: c.value.id,
    })
  })

  it('is a no-op when the name is unchanged', async () => {
    const c = await createFolderEntity(root, 'collection', 'Same')
    if (!c.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(c.value.path, 'Same')).ok).toBe(true)
  })

  it('rejects renaming onto an existing name', async () => {
    const a = await createFolderEntity(root, 'collection', 'A')
    await createFolderEntity(root, 'collection', 'B')
    if (!a.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(a.value.path, 'B')).ok).toBe(false)
  })

  it('lands a case-only rename', async () => {
    const c = await createFolderEntity(root, 'collection', 'notes')
    if (!c.ok) throw new Error('setup failed')
    expect((await renameFolderEntity(c.value.path, 'Notes')).ok).toBe(true)
    expect(await readdir(root)).toEqual(['Notes'])
  })
})
