import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dropLiveTree, refreshTree } from '../liveTree'
import { closeSessionDb, openSessionDb, sessionVersionsDb } from '../sessionDb'
import { listSnapshots, readSnapshot } from '../Database/versionsDb'
import { splitEnvelope } from '../IO/pageFile'
import type { Db } from '../Database/driver'
import {
  SNAPSHOT_MAX_BYTES,
  captureIfDue,
  flushFileHistory,
  noteExternalEdit,
  resetFileHistory,
  sweepFileHistory,
  writeBody,
} from './fileHistory'

const PAGE = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const TASK = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const OTHER = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const MINUTE = 60_000

let root: string
let file: string
const abs = (...segs: string[]): string => join(root, ...segs)
const db = (): Db => sessionVersionsDb() as Db
const rows = (id = PAGE) => listSnapshots(db(), id)
const bodyOf = (id: string, ts: number): string =>
  splitEnvelope(readSnapshot(db(), id, ts) ?? '').body

const settle = async (personalization: Record<string, unknown> = {}): Promise<void> => {
  await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ personalization }))
  await refreshTree(root)
}
const tick = (ms = 1000): void => {
  vi.advanceTimersByTime(ms)
}
const untilRows = async (n: number, id = PAGE): Promise<void> => {
  for (let i = 0; i < 200 && rows(id).length < n; i++) await new Promise((r) => setImmediate(r))
}
const settleIo = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r))
}
const advance = async (ms: number, expectRows: number): Promise<void> => {
  await settleIo()
  await vi.advanceTimersByTimeAsync(ms)
  await settleIo()
  await untilRows(expectRows)
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date('2026-09-02T12:00:00Z'))
  root = await mkdtemp(join(tmpdir(), 'pom-history-'))
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  file = abs('Notes', 'A.md')
  await writeFile(file, `---\nID: ${PAGE}\n---\none\n`)
  await settle()
  openSessionDb(root)
})
afterEach(async () => {
  resetFileHistory()
  closeSessionDb()
  dropLiveTree()
  vi.useRealTimers()
  await rm(root, { recursive: true, force: true })
})

describe('captureIfDue', () => {
  it('captures the first offer, then holds until the interval passes', async () => {
    expect(await captureIfDue(root, PAGE, 'first', 'edit')).toBe(true)
    vi.advanceTimersByTime(4 * MINUTE)
    expect(await captureIfDue(root, PAGE, 'second', 'edit')).toBe(false)
    vi.advanceTimersByTime(MINUTE)
    expect(await captureIfDue(root, PAGE, 'third', 'edit')).toBe(true)
    expect(rows().map((r) => r.source)).toEqual(['edit', 'edit'])
  })

  it('a restore offer lands inside the interval', async () => {
    await captureIfDue(root, PAGE, 'first', 'edit')
    tick()
    expect(await captureIfDue(root, PAGE, 'again', 'edit')).toBe(false)
    expect(await captureIfDue(root, PAGE, 'restored-over', 'restore')).toBe(true)
    expect(rows()[0].source).toBe('restore')
  })

  it('never stores the body it already holds, and a refused duplicate leaves the clock alone', async () => {
    await captureIfDue(root, PAGE, '---\nID: x\n---\nsame', 'edit')
    vi.advanceTimersByTime(10 * MINUTE)
    expect(await captureIfDue(root, PAGE, '---\nID: y\n---\nsame', 'edit')).toBe(false)
    expect(rows()).toHaveLength(1)
    tick()
    expect(await captureIfDue(root, PAGE, 'changed', 'edit')).toBe(true)
  })

  it('refuses a text over the cap, a non-page id, and a switched-off history', async () => {
    expect(await captureIfDue(root, PAGE, 'x'.repeat(SNAPSHOT_MAX_BYTES + 1), 'edit')).toBe(false)
    expect(await captureIfDue(root, TASK, 'task text', 'edit')).toBe(false)
    await settle({ fileHistory: false })
    expect(await captureIfDue(root, PAGE, 'off', 'edit')).toBe(false)
    expect(rows()).toEqual([])
    expect(rows(TASK)).toEqual([])
  })

  it('reads the interval from the nexus', async () => {
    await settle({ historyInterval: 10 })
    await captureIfDue(root, PAGE, 'first', 'edit')
    vi.advanceTimersByTime(6 * MINUTE)
    expect(await captureIfDue(root, PAGE, 'second', 'edit')).toBe(false)
    vi.advanceTimersByTime(4 * MINUTE)
    expect(await captureIfDue(root, PAGE, 'third', 'edit')).toBe(true)
  })
})

describe('writeBody', () => {
  it('writes the body and captures the text it overwrote', async () => {
    const r = await writeBody(root, file, 'two', 'edit')
    expect(r.ok).toBe(true)
    expect(splitEnvelope(await readFile(file, 'utf8')).body).toBe('two')
    expect(rows()).toHaveLength(1)
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('one\n')
  })

  it('a folded line ending is not a foreign edit on the second save', async () => {
    await writeFile(file, `---\r\nID: ${PAGE}\r\n---\r\n\r\none\r\n`)
    await writeBody(root, file, 'two', 'edit')
    await writeBody(root, file, 'three', 'edit')
    expect(rows()).toHaveLength(1)
  })

  it('captures a foreign body it is about to overwrite, inside the interval', async () => {
    await writeBody(root, file, 'two', 'edit')
    await writeFile(file, `---\nID: ${PAGE}\n---\nobsidian wrote this`)
    tick()
    await writeBody(root, file, 'three', 'edit')
    expect(rows().map((r) => r.source)).toEqual(['external', 'edit'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('obsidian wrote this')
  })

  it('a restore captures what it replaces, ungated, then writes', async () => {
    await writeBody(root, file, 'two', 'edit')
    tick()
    await writeBody(root, file, 'three', 'edit')
    tick()
    const r = await writeBody(root, file, 'one', 'restore')
    expect(r.ok).toBe(true)
    expect(rows().map((r) => r.source)).toEqual(['restore', 'edit'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('three')
    expect(splitEnvelope(await readFile(file, 'utf8')).body).toBe('one')
  })

  it('a restore arms no quiet timer', async () => {
    await writeBody(root, file, 'two', 'edit')
    tick()
    await writeBody(root, file, 'one', 'restore')
    await advance(10 * MINUTE, 2)
    expect(rows()).toHaveLength(2)
  })

  it('answers not-found for a missing page and captures nothing', async () => {
    const r = await writeBody(root, abs('Notes', 'Missing.md'), 'x', 'edit')
    expect(r.ok).toBe(false)
    expect(rows()).toEqual([])
  })
})

describe('the quiet timer', () => {
  it('fires once at the interval with the settled text, and resets on a new write', async () => {
    await writeBody(root, file, 'two', 'edit')
    await advance(4 * MINUTE, 1)
    await writeBody(root, file, 'three', 'edit')
    await advance(4 * MINUTE, 1)
    expect(rows()).toHaveLength(1)
    await advance(MINUTE, 2)
    expect(rows()).toHaveLength(2)
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('three')
    await advance(10 * MINUTE, 2)
    expect(rows()).toHaveLength(2)
  })

  it('an external edit arms the timer with its own source', async () => {
    await writeFile(file, `---\nID: ${PAGE}\n---\nfrom outside`)
    noteExternalEdit(root, file)
    await advance(5 * MINUTE, 1)
    expect(rows().map((r) => r.source)).toEqual(['external'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('from outside')
  })

  it('disarms when the page is gone or claimed twice', async () => {
    await writeBody(root, file, 'two', 'edit')
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${PAGE}\n---\ntwin`)
    await refreshTree(root)
    await advance(5 * MINUTE, 1)
    expect(rows()).toHaveLength(1)
    noteExternalEdit(root, file)
    await rm(abs('Notes', 'B.md'))
    await rm(file)
    await refreshTree(root)
    await advance(5 * MINUTE, 1)
    expect(rows()).toHaveLength(1)
  })

  it('a flush keeps the source an external arming gave', async () => {
    await writeFile(file, `---\nID: ${PAGE}\n---\nfrom outside`)
    noteExternalEdit(root, file)
    await settleIo()
    await flushFileHistory(root)
    expect(rows().map((r) => r.source)).toEqual(['external'])
  })

  it('a flush captures every armed page at once and a reset leaves no timer', async () => {
    await writeBody(root, file, 'two', 'edit')
    tick()
    await flushFileHistory(root)
    expect(rows()).toHaveLength(2)
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('two')
    tick()
    await writeBody(root, file, 'three', 'edit')
    resetFileHistory()
    await advance(10 * MINUTE, 2)
    expect(rows()).toHaveLength(2)
  })
})

describe('a switch of roots', () => {
  it('leaves the old store holding its row and the new one empty', async () => {
    await writeBody(root, file, 'two', 'edit')
    await flushFileHistory(root)
    resetFileHistory()
    const before = rows().length
    const next = await mkdtemp(join(tmpdir(), 'pom-history-next-'))
    closeSessionDb()
    openSessionDb(next)
    expect(rows()).toEqual([])
    closeSessionDb()
    openSessionDb(root)
    expect(rows()).toHaveLength(before)
    await rm(next, { recursive: true, force: true })
  })
})

describe('sweepFileHistory', () => {
  it('removes only rows older than the timeframe', async () => {
    await captureIfDue(root, PAGE, 'old', 'edit')
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    await captureIfDue(root, OTHER, 'new', 'edit')
    await sweepFileHistory(root)
    expect(rows()).toEqual([])
    expect(rows(OTHER)).toHaveLength(1)
  })
})
