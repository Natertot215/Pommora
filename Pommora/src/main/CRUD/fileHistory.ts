// The page-history rule: when a snapshot happens, and the one path every body write takes.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { kindOf } from '@shared/identity'
import { errText, fail, ok, type Result } from '@shared/result'
import {
  addSnapshot,
  clearSnapshots,
  deleteSnapshots,
  latestSnapshot,
  listSnapshots,
  readSnapshot,
  type SnapshotSource,
  sweepSnapshots,
} from '../Database/versionsDb'
import { indexWrittenPage } from '../indexSeed'
import { splitEnvelope } from '../IO/pageFile'
import { sessionVersionsDb } from '../sessionDb'
import { readFileHistoryConfig } from '../settings'
import { liveIdOf, livePathOf, noteValueWrite } from '../valuesChanged'
import type { Db } from '../Database/driver'
import { updatePageBody } from './page'

export const SNAPSHOT_MAX_BYTES = 1_048_576

const lastTs = new Map<string, number>()
const lastWritten = new Map<string, string>()
const timers = new Map<string, { source: SnapshotSource; timer: NodeJS.Timeout }>()

const bodyHash = (text: string): string =>
  createHash('sha1').update(splitEnvelope(text).body).digest('hex')

async function capture(
  root: string,
  pageId: string,
  text: string,
  source: SnapshotSource,
  gated: boolean,
  hash = bodyHash(text),
): Promise<boolean> {
  try {
    if (kindOf(pageId) !== 'page') return false
    if (source === 'edit' && Buffer.byteLength(text) > SNAPSHOT_MAX_BYTES) return false
    const now = Date.now()
    const { enabled, intervalMs } = await readFileHistoryConfig(root)
    if (!enabled) return false
    const last = lastTs.get(pageId)
    if (gated && last !== undefined && now - last < intervalMs) return false
    const db = sessionVersionsDb()
    if (!db) return false
    const latest = latestSnapshot(db, pageId)
    if (latest && bodyHash(latest.text) === hash) return false
    addSnapshot(db, pageId, now, source, text)
    lastTs.set(pageId, now)
    return true
  } catch (e) {
    console.error('file history: a snapshot was not recorded:', errText(e))
    return false
  }
}

/** Offer a page's text to the store: an `edit` waits out the interval since the page's last
 *  snapshot; `external` and `restore` land at once. Identical text never lands twice. */
export const captureIfDue = (
  root: string,
  pageId: string,
  text: string,
  source: SnapshotSource,
  hash?: string,
): Promise<boolean> => capture(root, pageId, text, source, source === 'edit', hash)

function disarm(pageId: string): void {
  const armed = timers.get(pageId)
  if (armed) clearTimeout(armed.timer)
  timers.delete(pageId)
}

function disarmAll(): [string, SnapshotSource][] {
  const armed: [string, SnapshotSource][] = []
  for (const [pageId, { source, timer }] of timers) {
    clearTimeout(timer)
    armed.push([pageId, source])
  }
  timers.clear()
  return armed
}

async function captureFromDisk(
  root: string,
  pageId: string,
  source: SnapshotSource,
  gated: boolean,
) {
  const rel = livePathOf(root, pageId)
  if (rel === null) return
  const text = await readFile(join(root, rel), 'utf8').catch(() => null)
  if (text !== null) await capture(root, pageId, text, source, gated)
}

/** The quiet timer: a burst of writes ends with one snapshot of the settled text. */
async function arm(root: string, pageId: string, source: SnapshotSource): Promise<void> {
  const { enabled, intervalMs } = await readFileHistoryConfig(root)
  disarm(pageId)
  if (!enabled) return
  const timer = setTimeout(() => {
    timers.delete(pageId)
    void captureFromDisk(root, pageId, source, source === 'edit')
  }, intervalMs)
  timer.unref()
  timers.set(pageId, { source, timer })
}

/** The one body-write path. The text being overwritten is offered first — at once when a foreign
 *  writer left it or a restore is replacing it — and the quiet timer is re-armed. The caller
 *  pushes the value change. */
export async function writeBody(
  root: string,
  absPath: string,
  body: string,
  source: 'edit' | 'restore',
): Promise<Result<null>> {
  const r = await updatePageBody(absPath, body)
  if (!r.ok) return r
  const { previous, written } = r.value
  const pageId = liveIdOf(root, absPath)
  const known = pageId ? lastWritten.get(pageId) : undefined
  const writtenHash = bodyHash(written)
  if (pageId) lastWritten.set(pageId, writtenHash)
  await indexWrittenPage(root, absPath)
  noteValueWrite(root, absPath)
  if (pageId) {
    const previousHash = previous === null ? writtenHash : bodyHash(previous)
    if (previous !== null && previousHash !== writtenHash) {
      const foreign = known !== undefined && known !== previousHash
      const offered: SnapshotSource =
        source === 'restore' ? 'restore' : foreign ? 'external' : 'edit'
      await captureIfDue(root, pageId, previous, offered, previousHash)
    }
    if (source === 'edit') await arm(root, pageId, 'edit')
    else disarm(pageId)
  }
  return ok(null)
}

export function noteExternalEdit(root: string, absPath: string): void {
  const pageId = liveIdOf(root, absPath)
  if (pageId) void arm(root, pageId, 'external')
}

/** Every armed page is offered now, ungated — before a switch, a rename, or a quit. Never rejects. */
export async function flushFileHistory(root: string): Promise<void> {
  await Promise.all(
    disarmAll().map(([pageId, source]) => captureFromDisk(root, pageId, source, false)),
  )
}

export function resetFileHistory(): void {
  disarmAll()
  lastTs.clear()
  lastWritten.clear()
}

/** A root is leaving: every armed page lands, then nothing of it remains. */
export async function retireFileHistory(root: string): Promise<void> {
  await flushFileHistory(root)
  resetFileHistory()
}

const NO_STORE = fail('operation-failed', 'File history is unavailable.')

const withStore = <T>(run: (db: Db) => Result<T>): Result<T> => {
  const db = sessionVersionsDb()
  return db ? run(db) : NO_STORE
}

/** The page's snapshot timestamps, newest first. */
export const listHistory = (pageId: string): Result<number[]> =>
  withStore((db) => ok(listSnapshots(db, pageId).map((r) => r.ts)))

export const readHistoryBody = (pageId: string, ts: number): Result<string> =>
  withStore((db) => {
    const text = readSnapshot(db, pageId, ts)
    return text === null ? fail('not-found', 'Snapshot not found.') : ok(splitEnvelope(text).body)
  })

/** The snapshot's body replaces the page's, at whatever path the page lives at now. */
export async function restoreSnapshot(
  root: string,
  pageId: string,
  ts: number,
): Promise<Result<{ path: string }>> {
  const rel = livePathOf(root, pageId)
  if (rel === null) return fail('not-found', 'Page not found.')
  const body = readHistoryBody(pageId, ts)
  if (!body.ok) return body
  const r = await writeBody(root, join(root, rel), body.value, 'restore')
  return r.ok ? ok({ path: rel }) : r
}

export const deleteHistory = (pageId: string, ts: readonly number[]): Result<number> =>
  withStore((db) => {
    lastTs.delete(pageId)
    return ok(deleteSnapshots(db, pageId, ts))
  })

export const clearHistory = (): Result<number> =>
  withStore((db) => {
    lastTs.clear()
    return ok(clearSnapshots(db))
  })

export async function sweepFileHistory(root: string): Promise<void> {
  const db = sessionVersionsDb()
  if (!db) return
  try {
    const { keepMs } = await readFileHistoryConfig(root)
    sweepSnapshots(db, Date.now() - keepMs)
  } catch (e) {
    console.error('file history: the sweep failed:', errText(e))
  }
}
