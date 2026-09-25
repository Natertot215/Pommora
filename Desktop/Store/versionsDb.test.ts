import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, readFile, writeFile, readdir, stat, truncate } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { DatabaseSync } from 'node:sqlite'
import { VERSIONS_FILENAME, openVersionsDb, snapshotStore } from './versionsDb'
import type { Db } from './driver'
import type { SnapshotStore } from '@pommora/core/Platform/stores'

let dir: string
let dbPath: string
beforeEach(async () => {
  dir = tempRoot('pom-versions-')
  dbPath = join(dir, VERSIONS_FILENAME)
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const opened = (): Db => {
  const db = openVersionsDb(dir)
  if (!db) throw new Error('the store did not open')
  return db
}
const corruptFiles = async (): Promise<string[]> =>
  (await readdir(dir)).filter((f) => f.includes('.corrupt-')).sort()

describe('openVersionsDb', () => {
  it('creates the file and the table', () => {
    const db = opened()
    expect(existsSync(dbPath)).toBe(true)
    expect(snapshotStore(db).listSnapshots('P1')).toEqual([])
    db.close()
  })

  it('reopens with rows intact', () => {
    const first = opened()
    snapshotStore(first).addSnapshot('P1', 10, 'edit', 'one')
    first.close()
    const second = opened()
    expect(snapshotStore(second).readSnapshot('P1', 10)).toBe('one')
    second.close()
  })

  it('quarantines a garbage header and starts fresh', async () => {
    await writeFile(dbPath, 'not a database', 'utf8')
    await writeFile(`${dbPath}-wal`, 'w', 'utf8')
    await writeFile(`${dbPath}-shm`, 's', 'utf8')
    const db = opened()
    expect(snapshotStore(db).listSnapshots('P1')).toEqual([])
    db.close()
    const [original, ...others] = await corruptFiles()
    expect(others).toEqual([])
    expect(original).toMatch(/^versions\.corrupt-.*\.db$/)
    expect(await readFile(join(dir, original), 'utf8')).toBe('not a database')
    expect(existsSync(`${dbPath}-wal`)).toBe(false)
    expect(existsSync(`${dbPath}-shm`)).toBe(false)
  })

  it('quarantines a truncated store and starts fresh', async () => {
    const first = opened()
    for (let ts = 1; ts <= 40; ts++)
      snapshotStore(first).addSnapshot('P1', ts, 'edit', 'x'.repeat(4000))
    first.close()
    await truncate(dbPath, Math.floor((await stat(dbPath)).size / 2))
    const db = opened()
    expect(snapshotStore(db).listSnapshots('P1')).toEqual([])
    db.close()
    expect(await corruptFiles()).toHaveLength(1)
  })

  it('leaves a store it cannot open where it is', async () => {
    await mkdir(dbPath, { recursive: true })
    expect(openVersionsDb(dir)).toBeNull()
    expect(existsSync(dbPath)).toBe(true)
    expect(await corruptFiles()).toEqual([])
  })

  it('quarantines interior corruption the header does not show', async () => {
    const first = opened()
    snapshotStore(first).addSnapshot('P1', 10, 'edit', 'one')
    first.close()
    const bytes = Buffer.from(await readFile(dbPath))
    for (let i = 4096; i < 4096 + 64; i++) bytes[i] = 0xff
    await writeFile(dbPath, bytes)
    const db = opened()
    expect(snapshotStore(db).listSnapshots('P1')).toEqual([])
    db.close()
    expect(await corruptFiles()).toHaveLength(1)
  })
})

describe('snapshots', () => {
  let db: Db
  let store: SnapshotStore
  beforeEach(() => {
    db = opened()
    store = snapshotStore(db)
  })
  afterEach(() => db.close())

  it('round-trips text through the compressed blob', () => {
    const text = `---\nID: P1\n---\n${'body '.repeat(500)}ünïcödé`
    store.addSnapshot('P1', 10, 'edit', text)
    expect(store.readSnapshot('P1', 10)).toBe(text)
    const raw = new DatabaseSync(dbPath)
    const row = raw.prepare('SELECT length(blob) AS n FROM snapshots').get() as { n: number }
    raw.close()
    expect(row.n).toBeLessThan(text.length)
  })

  it('a same-ts add replaces', () => {
    store.addSnapshot('P1', 10, 'edit', 'one')
    store.addSnapshot('P1', 10, 'edit', 'uno')
    expect(store.listSnapshots('P1')).toHaveLength(1)
    expect(store.readSnapshot('P1', 10)).toBe('uno')
  })

  it('delete answers its count and leaves other pages', () => {
    store.addSnapshot('P1', 10, 'edit', 'one')
    store.addSnapshot('P1', 20, 'edit', 'two')
    store.addSnapshot('P2', 10, 'edit', 'other')
    expect(store.deleteSnapshots('P1', [10, 20, 99])).toBe(2)
    expect(store.deleteSnapshots('P1', [])).toBe(0)
    expect(store.listSnapshots('P1')).toEqual([])
    expect(store.readSnapshot('P2', 10)).toBe('other')
  })

  it('clear empties the store and gives its bytes back', async () => {
    for (let ts = 1; ts <= 400; ts++)
      store.addSnapshot('P1', ts, 'edit', randomBytes(12_000).toString('base64'))
    store.addSnapshot('P2', 10, 'edit', 'other')
    const full = (await stat(dbPath)).size
    expect(store.clearSnapshots()).toBe(401)
    expect(store.listSnapshots('P2')).toEqual([])
    expect((await stat(dbPath)).size).toBeLessThan(full / 10)
  })
})
