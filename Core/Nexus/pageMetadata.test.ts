import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import { metadataShardPath } from '../Paths/paths'
import { METADATA_DIR_REL } from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import { contentIdAt } from './ids'
import {
  copyPageMetadata,
  dropPageMetadata,
  readShard,
  updatePageMetadata,
  withShards,
} from './pageMetadata'

const SEP_A = contentIdAt(Date.UTC(2026, 8, 5), 'page')
const SEP_B = contentIdAt(Date.UTC(2026, 8, 20), 'page')
const AUG = contentIdAt(Date.UTC(2026, 7, 10), 'page')

describe('withShards', () => {
  const held = { [SEP_A]: { icon: 'star' }, [AUG]: { locked: true as const } }

  it('swaps one month whole and leaves every other month by reference', () => {
    const next = withShards(held, { '09-2026': { [SEP_B]: { aliases: ['b'] } } })
    expect(next).toEqual({ [SEP_B]: { aliases: ['b'] }, [AUG]: { locked: true } })
    expect(next[AUG]).toBe(held[AUG])
  })

  it('drops an entry filed under a month its id does not map to', () => {
    const next = withShards(held, {
      '09-2026': { [SEP_A]: { icon: 'star' }, [AUG]: { icon: 'x' } },
    })
    expect(next[AUG]).toBe(held[AUG])
  })

  it('returns the held map itself for an identical payload', () => {
    expect(withShards(held, { '09-2026': { [SEP_A]: { icon: 'star' } } })).toBe(held)
  })
})

describe('readShard', () => {
  let root: string
  beforeEach(async () => {
    root = tempRoot('pom-meta-')
    await mkdir(join(root, METADATA_DIR_REL), { recursive: true })
  })
  afterEach(() => rm(root, { recursive: true, force: true }))

  it('parses a month, dropping an entry that parses empty', async () => {
    await writeFile(
      metadataShardPath(root, '09-2026'),
      JSON.stringify({
        pages: { [SEP_A]: { icon: 'star', extra: 1 }, [SEP_B]: { locked: false } },
      }),
    )
    expect(await readShard(root, '09-2026')).toEqual({
      kind: 'ok',
      pages: { [SEP_A]: { icon: 'star' } },
    })
  })

  it('reports a missing month absent and a corrupt one unreadable', async () => {
    expect(await readShard(root, '09-2026')).toEqual({ kind: 'absent' })
    await writeFile(metadataShardPath(root, '09-2026'), '{ bad json')
    expect(await readShard(root, '09-2026')).toEqual({ kind: 'unreadable' })
  })
})

describe('the writer', () => {
  let root: string
  beforeEach(() => {
    root = tempRoot('pom-meta-write-')
  })
  afterEach(() => rm(root, { recursive: true, force: true }))

  const shardOnDisk = async (shard: string): Promise<unknown> =>
    JSON.parse(await readFile(metadataShardPath(root, shard), 'utf8'))

  it('a patch on a fresh month creates its file with one entry', async () => {
    expect(await updatePageMetadata(root, SEP_A, { icon: 'star' })).toEqual({
      ok: true,
      value: null,
    })
    expect(await shardOnDisk('09-2026')).toEqual({ pages: { [SEP_A]: { icon: 'star' } } })
  })

  it('clearing the last field leaves an empty month', async () => {
    await updatePageMetadata(root, SEP_A, { icon: 'star', locked: true })
    await updatePageMetadata(root, SEP_A, { icon: null, locked: null })
    expect(await shardOnDisk('09-2026')).toEqual({ pages: {} })
  })

  it('a no-op patch leaves the file unwritten', async () => {
    await updatePageMetadata(root, SEP_A, { aliases: ['a', 'b'] })
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(metadataShardPath(root, '09-2026'), past, past)
    await updatePageMetadata(root, SEP_A, { aliases: ['a', 'b'], locked: null })
    expect((await stat(metadataShardPath(root, '09-2026'))).mtimeMs).toBe(past.getTime())
  })

  it('keeps fields this build does not model, and a no-op still writes nothing', async () => {
    await mkdir(join(root, METADATA_DIR_REL), { recursive: true })
    await writeFile(
      metadataShardPath(root, '09-2026'),
      JSON.stringify({ pages: { [SEP_A]: { icon: 'x', pinned: true } } }),
    )
    await updatePageMetadata(root, SEP_A, { locked: true })
    expect(await shardOnDisk('09-2026')).toEqual({
      pages: { [SEP_A]: { icon: 'x', pinned: true, locked: true } },
    })
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(metadataShardPath(root, '09-2026'), past, past)
    await updatePageMetadata(root, SEP_A, { icon: 'x' })
    expect((await stat(metadataShardPath(root, '09-2026'))).mtimeMs).toBe(past.getTime())
    await updatePageMetadata(root, SEP_A, { icon: null, locked: null })
    expect(await shardOnDisk('09-2026')).toEqual({ pages: { [SEP_A]: { pinned: true } } })
  })

  it('refuses an ID that maps to no month', async () => {
    const r = await updatePageMetadata(root, 'adopted-x', { icon: 'star' })
    expect(r.ok).toBe(false)
  })

  it('dropPageMetadata writes each month it names', async () => {
    await updatePageMetadata(root, SEP_A, { icon: 'a' })
    await updatePageMetadata(root, SEP_B, { icon: 'b' })
    await updatePageMetadata(root, AUG, { icon: 'c' })
    await dropPageMetadata(root, [SEP_A, AUG], null)
    expect(await shardOnDisk('09-2026')).toEqual({ pages: { [SEP_B]: { icon: 'b' } } })
    expect(await shardOnDisk('08-2026')).toEqual({ pages: {} })
  })

  const corruptSeptember = async (): Promise<string> => {
    await mkdir(join(root, METADATA_DIR_REL), { recursive: true })
    const bytes = `{ "pages": { "${SEP_B}": { "icon": "b" }, } }`
    await writeFile(metadataShardPath(root, '09-2026'), bytes)
    return bytes
  }

  const setAside = async (): Promise<string[]> =>
    (await readdir(join(root, METADATA_DIR_REL))).filter((n) => n.includes('.bad-'))

  it('a corrupt month refuses a patch and keeps its bytes', async () => {
    const bytes = await corruptSeptember()
    expect(await updatePageMetadata(root, SEP_A, { icon: 'a' })).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'Corrupt JSON: 09-2026.json' },
    })
    expect(await readFile(metadataShardPath(root, '09-2026'), 'utf8')).toBe(bytes)
    expect(await setAside()).toEqual([])
  })

  it('a corrupt month refuses a drop, logs, and keeps its bytes', async () => {
    const bytes = await corruptSeptember()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    await dropPageMetadata(root, [SEP_B], null)
    expect(logged).toHaveBeenCalledWith(
      'metadata: 09-2026 kept dropped entries:',
      'Corrupt JSON: 09-2026.json',
    )
    logged.mockRestore()
    expect(await readFile(metadataShardPath(root, '09-2026'), 'utf8')).toBe(bytes)
    expect(await setAside()).toEqual([])
  })

  it('copyPageMetadata carries fields this build does not model', async () => {
    await mkdir(join(root, METADATA_DIR_REL), { recursive: true })
    await writeFile(
      metadataShardPath(root, '08-2026'),
      JSON.stringify({ pages: { [AUG]: { icon: 'star', future_field: 7 } } }),
    )
    await copyPageMetadata(root, [[AUG, SEP_A]])
    expect(await shardOnDisk('09-2026')).toEqual({
      pages: { [SEP_A]: { icon: 'star', future_field: 7 } },
    })
  })

  it('copyPageMetadata lands an August entry under a September ID in its own month', async () => {
    await updatePageMetadata(root, AUG, { icon: 'star', locked: true })
    await copyPageMetadata(root, [[AUG, SEP_A]])
    expect(await shardOnDisk('09-2026')).toEqual({
      pages: { [SEP_A]: { icon: 'star', locked: true } },
    })
    expect(await shardOnDisk('08-2026')).toEqual({
      pages: { [AUG]: { icon: 'star', locked: true } },
    })
  })
})
