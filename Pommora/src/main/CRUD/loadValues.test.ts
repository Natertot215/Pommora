import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, utimes } from 'node:fs/promises'
import { decodeTime } from 'ulidx'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadValues } from './loadValues'

const P1 = '01KVGMT8BFG350FZZXAMG1QDR1'
const P2 = '01KVGMT8BFG350FZZXAMG1QDR2'

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
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDR1\n<Areas>:\n  - Work\nStatus: in_progress\n---\n\nbody\n',
    )
    await writeFile(
      join(root, 'Col', 'SetA', 'p2.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDR2\n<Count>: 7\n---\n\nbody\n',
    )

    const values = await loadValues(root, 'Col')
    expect(Object.keys(values).sort()).toEqual([P1, P2])
    expect(values[P1].frontmatter['<Areas>']).toEqual(['Work'])
    // Wrapped keys ride the loose frontmatter unmodeled — the batch read needs no schema at all.
    expect((values[P1].frontmatter as Record<string, unknown>).Status).toBe('in_progress')
    expect((values[P2].frontmatter as Record<string, unknown>)['<Count>']).toBe(7)
  })

  // Local-clock form, the shape the date picker writes: a filter's calendar-day truncation and
  // the cell's rendering must land on the same day, which a UTC `Z` string breaks every evening
  // west of Greenwich.
  it("carries the file's mtime and the id's time in the machine's local clock", async () => {
    const tz = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      await mkdir(join(root, 'Col'), { recursive: true })
      const file = join(root, 'Col', 'p1.md')
      await writeFile(file, `---\nPageID: ${P1}\n---\n\nbody\n`)
      const modified = new Date('2026-09-02T00:30:00.000Z')
      await utimes(file, modified, modified)

      const values = await loadValues(root, 'Col')
      expect(values[P1].modifiedAt).toBe('2026-09-01T20:30:00')
      expect(values[P1].createdAt).toBe('2026-06-19T15:13:08')
    } finally {
      if (tz === undefined) delete process.env.TZ
      else process.env.TZ = tz
    }
  })

  it('one undecodable PageID leaves the rest of the batch intact', async () => {
    await mkdir(join(root, 'Col'), { recursive: true })
    const bad = `8${P1.slice(1)}`
    await writeFile(join(root, 'Col', 'p1.md'), `---\nPageID: ${P1}\n---\n\nbody\n`)
    await writeFile(join(root, 'Col', 'bad.md'), `---\nPageID: ${bad}\n---\n\nbody\n`)

    const values = await loadValues(root, 'Col')
    expect(values[bad].createdAt).toBeNull()
    expect(Date.parse(values[P1].createdAt!)).toBe(Math.floor(decodeTime(P1) / 1000) * 1000)
  })

  // An identity-less page must reach the value batch whole, not just as a key — a row that lands
  // in the map with its values dropped renders blank, which reads as data loss rather than as a
  // page awaiting adoption.
  it('keys an id-less page by its adopted id, carrying its values intact', async () => {
    await mkdir(join(root, 'Col'), { recursive: true })
    await writeFile(
      join(root, 'Col', 'noid.md'),
      '---\ntitle: x\n<Areas>:\n  - Work\nStatus: in_progress\n---\n\nbody\n',
    )

    const values = await loadValues(root, 'Col')
    const keys = Object.keys(values)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^adopted-/)
    const row = values[keys[0]].frontmatter as Record<string, unknown>
    expect(row['<Areas>']).toEqual(['Work'])
    expect(row.Status).toBe('in_progress')
    expect(values[keys[0]].createdAt).toBeNull()
  })

  it('returns an empty map for an absent container', async () => {
    expect(await loadValues(root, 'Nope')).toEqual({})
  })
})
