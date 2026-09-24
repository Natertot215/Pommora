import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readdir, rm, stat } from 'node:fs/promises'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { ensureIdentity } from '@pommora/core/Nexus/identity'
import { thumbKey, thumbRel } from '@pommora/core/Paths/nexusPaths'
import { evictThumbnails } from './thumbnails'

describe('thumbnail keys + rel', () => {
  it('sanitizes the navKey colon for the filename', () => {
    expect(thumbKey('page:abc')).toBe('page-abc')
    expect(thumbKey('homepage')).toBe('homepage')
  })
  it('builds a POSIX asset-relative path under the nexus assets tree', () => {
    expect(thumbRel('nx1', 'page-abc')).toBe('.nexus/assets/nx1/thumbnails/page-abc.jpg')
  })
})

describe('evictThumbnails', () => {
  let root: string
  beforeEach(async () => {
    root = tempRoot('pom-thumbs-')
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('deletes only the thumbnails not in the live set', async () => {
    const { id } = await ensureIdentity(root)
    if (id === null) throw new Error('the identity did not mint')
    const dir = join(root, '.nexus', 'assets', id, 'thumbnails')
    await mkdir(dir, { recursive: true })
    for (const name of ['page-a.jpg', 'page-b.jpg', 'collection-c.jpg'])
      await writeFile(join(dir, name), 'x')
    await evictThumbnails(root, id, ['page:a', 'collection:c'])
    expect((await readdir(dir)).sort()).toEqual(['collection-c.jpg', 'page-a.jpg'])
  })

  it('is a no-op when the folder is absent, and mints no identity', async () => {
    await expect(evictThumbnails(root, 'nx1', [])).resolves.toBeUndefined()
    await expect(stat(join(root, '.nexus', 'nexus.json'))).rejects.toThrow()
  })
})
