import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, writeFile, readdir, stat, truncate } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  VERSIONS_FILENAME,
  openVersionsDb,
  addSnapshot,
  latestSnapshot,
  listSnapshots,
  readSnapshot,
  deleteSnapshots,
  clearSnapshots,
  sweepSnapshots,
} from './versionsDb'
import type { Db } from './driver'
import { ignoredUnder } from '../watcher'

let root: string
let dbPath: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-versions-'))
  dbPath = join(root, '.nexus', VERSIONS_FILENAME)
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const opened = (): Db => {
  const db = openVersionsDb(root)
  if (!db) throw new Error('the store did not open')
  return db
}
const corruptFiles = async (): Promise<string[]> =>
  (await readdir(join(root, '.nexus'))).filter((f) => f.includes('.corrupt-')).sort()

describe('openVersionsDb', () => {
  it('creates the file and the table', () => {
    const db = opened()
    expect(existsSync(dbPath)).toBe(true)
    expect(listSnapshots(db, 'P1')).toEqual([])
    db.close()
  })

  it('reopens with rows intact', () => {
    const first = opened()
    addSnapshot(first, 'P1', 10, 'edit', 'one')
    first.close()
    const second = opened()
    expect(readSnapshot(second, 'P1', 10)).toBe('one')
    second.close()
  })

  it('quarantines a garbage header and starts fresh', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(dbPath, 'not a database', 'utf8')
    await writeFile(`${dbPath}-wal`, 'w', 'utf8')
    await writeFile(`${dbPath}-shm`, 's', 'utf8')
    const db = opened()
    expect(listSnapshots(db, 'P1')).toEqual([])
    db.close()
    const [original, ...others] = await corruptFiles()
    expect(others).toEqual([])
    expect(original).toMatch(/^versions\.corrupt-.*\.db$/)
    expect(await readFile(join(root, '.nexus', original), 'utf8')).toBe('not a database')
    expect(ignoredUnder(root, { excluded: [], assetDir: '' })(join(root, '.nexus', original))).toBe(
      true,
    )
    expect(existsSync(`${dbPath}-wal`)).toBe(false)
    expect(existsSync(`${dbPath}-shm`)).toBe(false)
  })

  it('quarantines a truncated store and starts fresh', async () => {
    const first = opened()
    for (let ts = 1; ts <= 40; ts++) addSnapshot(first, 'P1', ts, 'edit', 'x'.repeat(4000))
    first.close()
    await truncate(dbPath, Math.floor((await stat(dbPath)).size / 2))
    const db = opened()
    expect(listSnapshots(db, 'P1')).toEqual([])
    db.close()
    expect(await corruptFiles()).toHaveLength(1)
  })

  it('leaves a store it cannot open where it is', async () => {
    await mkdir(dbPath, { recursive: true })
    expect(openVersionsDb(root)).toBeNull()
    expect(existsSync(dbPath)).toBe(true)
    expect(await corruptFiles()).toEqual([])
  })

  it('quarantines interior corruption the header does not show', async () => {
    const first = opened()
    addSnapshot(first, 'P1', 10, 'edit', 'one')
    first.close()
    const bytes = Buffer.from(await readFile(dbPath))
    for (let i = 4096; i < 4096 + 64; i++) bytes[i] = 0xff
    await writeFile(dbPath, bytes)
    const db = opened()
    expect(listSnapshots(db, 'P1')).toEqual([])
    db.close()
    expect(await corruptFiles()).toHaveLength(1)
  })
})

describe('snapshots', () => {
  let db: Db
  beforeEach(() => {
    db = opened()
  })
  afterEach(() => db.close())

  it('round-trips text through the compressed blob', () => {
    const text = `---\nID: P1\n---\n${'body '.repeat(500)}ünïcödé`
    addSnapshot(db, 'P1', 10, 'edit', text)
    expect(readSnapshot(db, 'P1', 10)).toBe(text)
    const raw = new DatabaseSync(dbPath)
    const row = raw.prepare('SELECT length(blob) AS n FROM snapshots').get() as { n: number }
    raw.close()
    expect(row.n).toBeLessThan(text.length)
  })

  it('lists newest first and answers the latest', () => {
    addSnapshot(db, 'P1', 10, 'edit', 'one')
    addSnapshot(db, 'P1', 30, 'external', 'three')
    addSnapshot(db, 'P1', 20, 'restore', 'two')
    expect(listSnapshots(db, 'P1')).toEqual([
      { ts: 30, source: 'external' },
      { ts: 20, source: 'restore' },
      { ts: 10, source: 'edit' },
    ])
    expect(latestSnapshot(db, 'P1')).toEqual({ ts: 30, text: 'three' })
    expect(latestSnapshot(db, 'P2')).toBeNull()
    expect(readSnapshot(db, 'P2', 10)).toBeNull()
  })

  it('a same-ts add replaces', () => {
    addSnapshot(db, 'P1', 10, 'edit', 'one')
    addSnapshot(db, 'P1', 10, 'edit', 'uno')
    expect(listSnapshots(db, 'P1')).toHaveLength(1)
    expect(readSnapshot(db, 'P1', 10)).toBe('uno')
  })

  it('delete answers its count and leaves other pages', () => {
    addSnapshot(db, 'P1', 10, 'edit', 'one')
    addSnapshot(db, 'P1', 20, 'edit', 'two')
    addSnapshot(db, 'P2', 10, 'edit', 'other')
    expect(deleteSnapshots(db, 'P1', [10, 20, 99])).toBe(2)
    expect(deleteSnapshots(db, 'P1', [])).toBe(0)
    expect(listSnapshots(db, 'P1')).toEqual([])
    expect(readSnapshot(db, 'P2', 10)).toBe('other')
  })

  it('clear empties the store and gives its bytes back', async () => {
    for (let ts = 1; ts <= 400; ts++)
      addSnapshot(db, 'P1', ts, 'edit', randomBytes(12_000).toString('base64'))
    addSnapshot(db, 'P2', 10, 'edit', 'other')
    const full = (await stat(dbPath)).size
    expect(clearSnapshots(db)).toBe(401)
    expect(listSnapshots(db, 'P2')).toEqual([])
    expect((await stat(dbPath)).size).toBeLessThan(full / 10)
  })

  it('sweep removes only rows older than the cutoff', () => {
    addSnapshot(db, 'P1', 10, 'edit', 'old')
    addSnapshot(db, 'P1', 20, 'edit', 'edge')
    addSnapshot(db, 'P2', 30, 'edit', 'new')
    expect(sweepSnapshots(db, 20)).toBe(1)
    expect(listSnapshots(db, 'P1')).toEqual([{ ts: 20, source: 'edit' }])
    expect(listSnapshots(db, 'P2')).toEqual([{ ts: 30, source: 'edit' }])
  })
})
