import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Result } from '@shared/result'
import { HISTORY_INTERVAL } from '@shared/types'
import { dropLiveTree, refreshTree } from '../liveTree'
import { closeSessionDb, openSessionDb, sessionVersionsDb } from '../sessionDb'
import { listSnapshots, readSnapshot } from '../Database/versionsDb'
import { splitEnvelope } from '../IO/pageFile'
import type { Db } from '../Database/driver'
import {
  SNAPSHOT_MAX_BYTES,
  captureIfDue,
  clearHistory,
  deleteHistory,
  flushFileHistory,
  noteExternalEdit,
  readHistoryBody,
  resetFileHistory,
  restoreSnapshot,
  sweepFileHistory,
  writeBody,
} from './fileHistory'

const PAGE = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const TASK = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const OTHER = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const MINUTE = 60_000
const INTERVAL = HISTORY_INTERVAL.default * MINUTE
const DAY = 86_400_000

let root: string
let file: string
const abs = (...segs: string[]): string => join(root, ...segs)
const page = (id: string, body: string): string => `---\nID: ${id}\n---\n${body}`
const db = (): Db => sessionVersionsDb() as Db
const rows = (id = PAGE) => listSnapshots(db(), id)
const sources = (id = PAGE): string[] => rows(id).map((r) => r.source)
const bodyOf = (id: string, ts: number): string =>
  splitEnvelope(readSnapshot(db(), id, ts) ?? '').body
const errorCode = (r: Result<unknown>): string | undefined => (r.ok ? undefined : r.error.code)

const settle = async (personalization: Record<string, unknown> = {}): Promise<void> => {
  await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ personalization }))
  await refreshTree(root)
}
const nextMs = (): void => {
  vi.advanceTimersByTime(1)
}
const settleIo = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r))
}
const advance = async (ms: number): Promise<void> => {
  await settleIo()
  await vi.advanceTimersByTimeAsync(ms)
  await settleIo()
}
const untilRows = async (n: number, id = PAGE): Promise<void> => {
  for (let i = 0; i < 200 && rows(id).length < n; i++) await new Promise((r) => setImmediate(r))
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
  await writeFile(file, page(PAGE, 'one\n'))
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
    vi.advanceTimersByTime(INTERVAL - MINUTE)
    expect(await captureIfDue(root, PAGE, 'second', 'edit')).toBe(false)
    vi.advanceTimersByTime(MINUTE)
    expect(await captureIfDue(root, PAGE, 'third', 'edit')).toBe(true)
    expect(sources()).toEqual(['edit', 'edit'])
  })

  it('a restore offer lands inside the interval', async () => {
    await captureIfDue(root, PAGE, 'first', 'edit')
    nextMs()
    expect(await captureIfDue(root, PAGE, 'again', 'edit')).toBe(false)
    expect(await captureIfDue(root, PAGE, 'restored-over', 'restore')).toBe(true)
    expect(sources()).toEqual(['restore', 'edit'])
  })

  it('never stores the body it already holds, and a refused duplicate leaves the clock alone', async () => {
    await captureIfDue(root, PAGE, page('x', 'same'), 'edit')
    vi.advanceTimersByTime(2 * INTERVAL)
    expect(await captureIfDue(root, PAGE, page('y', 'same'), 'edit')).toBe(false)
    expect(rows()).toHaveLength(1)
    nextMs()
    expect(await captureIfDue(root, PAGE, 'changed', 'edit')).toBe(true)
  })

  it('the cap binds an edit alone; external and restore text lands at any size', async () => {
    const big = 'x'.repeat(SNAPSHOT_MAX_BYTES + 1)
    expect(await captureIfDue(root, PAGE, big, 'edit')).toBe(false)
    expect(await captureIfDue(root, PAGE, big, 'external')).toBe(true)
    nextMs()
    expect(await captureIfDue(root, PAGE, `${big}y`, 'restore')).toBe(true)
    expect(sources()).toEqual(['restore', 'external'])
  })

  it('refuses a non-page id, and everything once history is switched off', async () => {
    await captureIfDue(root, PAGE, 'held', 'edit')
    expect(await captureIfDue(root, TASK, 'task text', 'edit')).toBe(false)
    expect(rows(TASK)).toEqual([])
    await settle({ fileHistory: false })
    vi.advanceTimersByTime(2 * INTERVAL)
    expect(await captureIfDue(root, PAGE, 'off', 'edit')).toBe(false)
    expect(await captureIfDue(root, PAGE, 'off', 'restore')).toBe(false)
    expect(rows()).toHaveLength(1)
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
    expect(r).toEqual({ ok: true, value: null })
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
    await writeFile(file, page(PAGE, 'obsidian wrote this'))
    nextMs()
    await writeBody(root, file, 'three', 'edit')
    expect(sources()).toEqual(['external', 'edit'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('obsidian wrote this')
  })

  it('a restore captures what it replaces, ungated, then writes', async () => {
    await writeBody(root, file, 'two', 'edit')
    nextMs()
    await writeBody(root, file, 'three', 'edit')
    nextMs()
    const r = await writeBody(root, file, 'one', 'restore')
    expect(r.ok).toBe(true)
    expect(sources()).toEqual(['restore', 'edit'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('three')
    expect(splitEnvelope(await readFile(file, 'utf8')).body).toBe('one')
  })

  it('restoring the text the page already holds records nothing', async () => {
    await writeBody(root, file, 'two', 'edit')
    nextMs()
    await writeBody(root, file, 'one', 'restore')
    nextMs()
    await writeBody(root, file, 'one', 'restore')
    expect(sources()).toEqual(['restore', 'edit'])
  })

  it('a restore arms no quiet timer', async () => {
    await writeBody(root, file, 'two', 'edit')
    nextMs()
    await writeBody(root, file, 'one', 'restore')
    expect(vi.getTimerCount()).toBe(0)
    await advance(2 * INTERVAL)
    expect(rows()).toHaveLength(2)
  })

  it('answers not-found for a missing page and captures nothing', async () => {
    const r = await writeBody(root, abs('Notes', 'Missing.md'), 'x', 'edit')
    expect(errorCode(r)).toBe('not-found')
    expect(rows()).toEqual([])
  })
})

describe('the quiet timer', () => {
  it('fires once at the interval with the settled text, and resets on a new write', async () => {
    await writeBody(root, file, 'two', 'edit')
    await advance(INTERVAL - MINUTE)
    await writeBody(root, file, 'three', 'edit')
    await advance(INTERVAL - MINUTE)
    expect(rows()).toHaveLength(1)
    await advance(MINUTE)
    await untilRows(2)
    expect(rows()).toHaveLength(2)
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('three')
    await advance(2 * INTERVAL)
    expect(rows()).toHaveLength(2)
  })

  it('a switched-off history arms nothing', async () => {
    await settle({ fileHistory: false })
    await writeBody(root, file, 'two', 'edit')
    noteExternalEdit(root, file)
    await settleIo()
    expect(vi.getTimerCount()).toBe(0)
    expect(rows()).toEqual([])
  })

  it('an external edit arms the timer with its own source', async () => {
    await writeFile(file, page(PAGE, 'from outside'))
    noteExternalEdit(root, file)
    await advance(INTERVAL)
    await untilRows(1)
    expect(sources()).toEqual(['external'])
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('from outside')
  })

  it('records nothing at the timer for an id two files claim', async () => {
    await writeBody(root, file, 'two', 'edit')
    await writeFile(abs('Notes', 'B.md'), page(PAGE, 'twin'))
    await refreshTree(root)
    await advance(INTERVAL)
    expect(vi.getTimerCount()).toBe(0)
    expect(rows()).toHaveLength(1)
  })

  it('records nothing at the timer for a page the tree no longer holds', async () => {
    await writeBody(root, file, 'two', 'edit')
    await rm(file)
    await refreshTree(root)
    await writeFile(file, page(PAGE, 'back on disk, unknown to the tree'))
    await advance(INTERVAL)
    expect(vi.getTimerCount()).toBe(0)
    expect(rows()).toHaveLength(1)
  })

  it('a flush keeps the source an external arming gave', async () => {
    await writeFile(file, page(PAGE, 'from outside'))
    noteExternalEdit(root, file)
    await settleIo()
    await flushFileHistory(root)
    expect(sources()).toEqual(['external'])
  })

  it('a flush captures every armed page at once', async () => {
    const other = abs('Notes', 'B.md')
    await writeFile(other, page(OTHER, 'b one'))
    await refreshTree(root)
    await writeBody(root, file, 'two', 'edit')
    await writeBody(root, other, 'b two', 'edit')
    nextMs()
    await flushFileHistory(root)
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('two')
    expect(bodyOf(OTHER, rows(OTHER)[0].ts)).toBe('b two')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a reset leaves no timer', async () => {
    await writeBody(root, file, 'two', 'edit')
    resetFileHistory()
    expect(vi.getTimerCount()).toBe(0)
    await advance(2 * INTERVAL)
    expect(rows()).toHaveLength(1)
  })
})

describe('a switch of roots', () => {
  it('leaves the old store holding its rows and the new one empty', async () => {
    await writeBody(root, file, 'two', 'edit')
    nextMs()
    await flushFileHistory(root)
    resetFileHistory()
    expect(rows()).toHaveLength(2)
    const next = await mkdtemp(join(tmpdir(), 'pom-history-next-'))
    closeSessionDb()
    openSessionDb(next)
    expect(rows()).toEqual([])
    closeSessionDb()
    openSessionDb(root)
    expect(rows()).toHaveLength(2)
    await rm(next, { recursive: true, force: true })
  })
})

describe('the history channels', () => {
  it('reads a snapshot body by its own page only', async () => {
    await writeBody(root, file, 'two', 'edit')
    const ts = rows()[0].ts
    expect(readHistoryBody(PAGE, ts)).toEqual({ ok: true, value: 'one\n' })
    expect(errorCode(readHistoryBody(OTHER, ts))).toBe('not-found')
  })

  it('a clear frees the interval clock', async () => {
    await writeBody(root, file, 'two', 'edit')
    expect(clearHistory()).toEqual({ ok: true, value: 1 })
    nextMs()
    await writeBody(root, file, 'three', 'edit')
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('two')
  })

  it('a delete frees the interval clock', async () => {
    await writeBody(root, file, 'two', 'edit')
    expect(deleteHistory(PAGE, [rows()[0].ts])).toEqual({ ok: true, value: 1 })
    nextMs()
    await writeBody(root, file, 'three', 'edit')
    expect(bodyOf(PAGE, rows()[0].ts)).toBe('two')
  })

  it("restores by id at the page's live path, answering that path", async () => {
    await writeBody(root, file, 'two', 'edit')
    const ts = rows()[0].ts
    const moved = abs('Notes', 'Renamed.md')
    await rename(file, moved)
    await refreshTree(root)
    nextMs()
    const r = await restoreSnapshot(root, PAGE, ts)
    expect(r).toEqual({ ok: true, value: { path: 'Notes/Renamed.md' } })
    expect(splitEnvelope(await readFile(moved, 'utf8')).body).toBe('one\n')
    expect(sources()).toEqual(['restore', 'edit'])
  })

  it('answers not-found for a page the tree does not hold', async () => {
    await writeBody(root, file, 'two', 'edit')
    expect(errorCode(await restoreSnapshot(root, OTHER, rows()[0].ts))).toBe('not-found')
  })
})

describe('sweepFileHistory', () => {
  it('removes rows older than the timeframe the nexus sets', async () => {
    await settle({ historyDays: 7 })
    await captureIfDue(root, PAGE, 'old', 'edit')
    vi.advanceTimersByTime(8 * DAY)
    await captureIfDue(root, OTHER, 'new', 'edit')
    await sweepFileHistory(root)
    expect(rows()).toEqual([])
    expect(rows(OTHER)).toHaveLength(1)
  })
})
