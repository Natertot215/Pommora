import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import { metadataShardPath } from '../Paths/paths'
import { METADATA_DIR_REL } from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import { contentIdAt } from './ids'
import { readShard, withShards } from './pageMetadata'

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
