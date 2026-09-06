import { join } from '../Locations/posix'
import { kindOf } from '../Nexus/identityMark'
import { errText, fail, ok, type Result } from '../Contract/result'
import { indexWrittenPage } from '../Index/indexSeed'
import { readTextOrNull } from '../IO/atomicWrite'
import { splitEnvelope } from '../IO/pageFile'
import { machine } from '../Platform/machine'
import { type SnapshotSource, type SnapshotStore, snapshotStore } from '../Platform/stores'
import { readFileHistoryConfig } from '../Settings/settings'
import { liveIdOf, livePathOf, noteValueWrite } from '../Nexus/valuesChanged'
import { updatePageBody } from '../Nexus/page'

export const SNAPSHOT_MAX_BYTES = 1_048_576

const lastTs = new Map<string, number>()
const lastWritten = new Map<string, string>()
const timers = new Map<string, { source: SnapshotSource; timer: NodeJS.Timeout }>()

const bodyHash = (text: string): string => machine().sha256Hex(splitEnvelope(text).body)

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
    if (source === 'edit' && new TextEncoder().encode(text).length > SNAPSHOT_MAX_BYTES)
      return false
    const now = Date.now()
    const { enabled, intervalMs } = await readFileHistoryConfig(root)
    if (!enabled) return false
    const last = lastTs.get(pageId)
    if (gated && last !== undefined && now - last < intervalMs) return false
    const db = snapshotStore()
    if (!db) return false
    const latest = db.latestSnapshot(pageId)
    if (latest && bodyHash(latest.text) === hash) return false
    db.addSnapshot(pageId, now, source, text)
    lastTs.set(pageId, now)
    return true
  } catch (e) {
    console.error('file history: a snapshot was not recorded:', errText(e))
    return false
  }
}

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
  const text = await readTextOrNull(join(root, rel))
  if (text !== null) await capture(root, pageId, text, source, gated)
}

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

export async function retireFileHistory(root: string): Promise<void> {
  await flushFileHistory(root)
  resetFileHistory()
}

const NO_STORE = fail('operation-failed', 'File history is unavailable.')

const withStore = <T>(run: (db: SnapshotStore) => Result<T>): Result<T> => {
  const db = snapshotStore()
  return db ? run(db) : NO_STORE
}

export const listHistory = (pageId: string): Result<number[]> =>
  withStore((db) => ok(db.listSnapshots(pageId).map((r) => r.ts)))

export const readHistoryBody = (pageId: string, ts: number): Result<string> =>
  withStore((db) => {
    const text = db.readSnapshot(pageId, ts)
    return text === null ? fail('not-found', 'Snapshot not found.') : ok(splitEnvelope(text).body)
  })

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
    return ok(db.deleteSnapshots(pageId, ts))
  })

export const clearHistory = (): Result<number> =>
  withStore((db) => {
    lastTs.clear()
    return ok(db.clearSnapshots())
  })

export async function sweepFileHistory(root: string): Promise<void> {
  const db = snapshotStore()
  if (!db) return
  try {
    const { keepMs } = await readFileHistoryConfig(root)
    db.sweepSnapshots(Date.now() - keepMs)
  } catch (e) {
    console.error('file history: the sweep failed:', errText(e))
  }
}
