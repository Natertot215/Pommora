import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadValues } from './loadValues'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-loadvalues-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('loadValues', () => {
  it('maps page id → frontmatter across the container and its nested Sets', async () => {
    await mkdir(join(root, 'Col', 'SetA'), { recursive: true })
    await writeFile(
      join(root, 'Col', 'p1.md'),
      '---\nid: p1\n(Areas):\n  - Work\n<Status>: in_progress\n---\n\nbody\n',
    )
    await writeFile(join(root, 'Col', 'SetA', 'p2.md'), '---\nid: p2\n<Count>: 7\n---\n\nbody\n')

    const values = await loadValues(root, 'Col')
    expect(Object.keys(values).sort()).toEqual(['p1', 'p2'])
    expect(values.p1['(Areas)']).toEqual(['Work'])
    // Wrapped keys ride the loose frontmatter unmodeled — the batch read needs no schema at all.
    expect((values.p1 as Record<string, unknown>)['<Status>']).toBe('in_progress')
    expect((values.p2 as Record<string, unknown>)['<Count>']).toBe(7)
  })

  // An identity-less page must reach the value batch whole, not just as a key — a row that lands
  // in the map with its values dropped renders blank, which reads as data loss rather than as a
  // page awaiting adoption.
  it('keys an id-less page by its adopted id, carrying its values intact', async () => {
    await mkdir(join(root, 'Col'), { recursive: true })
    await writeFile(
      join(root, 'Col', 'noid.md'),
      '---\ntitle: x\n(Areas):\n  - Work\n<Status>: in_progress\n---\n\nbody\n',
    )

    const values = await loadValues(root, 'Col')
    const keys = Object.keys(values)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^adopted-/)
    const row = values[keys[0]] as Record<string, unknown>
    expect(row['(Areas)']).toEqual(['Work'])
    expect(row['<Status>']).toBe('in_progress')
  })

  it('returns an empty map for an absent container', async () => {
    expect(await loadValues(root, 'Nope')).toEqual({})
  })
})
