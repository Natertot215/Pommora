// The single owner of safe writes for the data layer. Every write goes to a temp
// sibling then atomically renames over the target (write-file-atomic does the
// temp + fsync + rename), so a crash can never leave a half-written file. Atomic on
// the SAME volume only — temps are siblings of the target, so a nexus stays intact.

import writeFileAtomic from 'write-file-atomic'
import { readFile, stat, utimes } from 'node:fs/promises'
import { basename } from 'node:path'
import { isPlainObject } from '../Properties/propertyValue'
import { stableStringify } from './stableJson'
import { fail, ok, type Result } from '../Contract/result'
import { forgetParse } from './walkCache'
import { recordWrite } from './writeEcho'
import { serializeOnFile } from './fileLock'

/** Atomically write a UTF-8 string to `filePath`. Recorded for watcher echo
 *  suppression — the app's own writes never trigger its own re-walk. */
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath)
  await writeFileAtomic(filePath, data, { encoding: 'utf8' })
}

/** Rewrite a file the user did not edit — a sweep, a migration, adoption — keeping its
 *  modification time: mtime is Last Modified, and the rename would otherwise stamp it with now. */
export async function rewritePreservingTimes(filePath: string, data: string): Promise<void> {
  const { atime, mtime } = await stat(filePath)
  await atomicWriteFile(filePath, data)
  // A volume that refuses utimes leaves the page dated now; the write itself already landed.
  await utimes(filePath, atime, mtime).catch(() => {})
  forgetParse(filePath)
}

/** Atomically write raw bytes to `filePath` (binary siblings of the UTF-8 writer). */
export async function atomicWriteBinary(filePath: string, data: Buffer): Promise<void> {
  recordWrite(filePath)
  await writeFileAtomic(filePath, data)
}

/** The canonical on-disk JSON bytes: stable, sorted keys + a trailing newline. The one
 *  source of the sidecar serialization shape, so a caller that holds bytes before writing
 *  them produces a file identical to one written directly. */
function serializeJson(value: unknown): string {
  return `${stableStringify(value)}\n`
}

/** The one JSON decode for files the user or another app may have written: a leading BOM is
 *  encoding, not corruption. */
export const parseJsonText = (text: string): unknown =>
  JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

/** Atomically write a JSON value with stable, sorted keys + a trailing newline. */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteFile(filePath, serializeJson(value))
}

type StrictRead =
  | { kind: 'ok'; value: Record<string, unknown> }
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'corrupt'; why: string }

async function readJsonStrictly(absPath: string): Promise<StrictRead> {
  let raw: string
  try {
    raw = await readFile(absPath, 'utf8')
  } catch (e) {
    return { kind: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'unreadable' }
  }
  try {
    const v = parseJsonText(raw)
    return isPlainObject(v)
      ? { kind: 'ok', value: v }
      : { kind: 'corrupt', why: 'Not a JSON object' }
  } catch {
    return { kind: 'corrupt', why: 'Corrupt JSON' }
  }
}

function strictResult(read: StrictRead, absPath: string): Result<Record<string, unknown>> {
  if (read.kind === 'ok') return ok(read.value)
  const why = read.kind === 'corrupt' ? read.why : 'Unreadable file'
  return fail(
    read.kind === 'absent' ? 'not-found' : 'operation-failed',
    `${why}: ${basename(absPath)}`,
  )
}

/** STRICT JSON read: a missing file is `not-found`, anything else unreadable/non-object is
 *  `operation-failed` — never a fallback. The read half of `rmwJsonStrict`, exposed for
 *  callers that branch on the failure kind (the registry's seed-vs-unmigrated split). */
export async function readJsonStrict(absPath: string): Promise<Result<Record<string, unknown>>> {
  return strictResult(await readJsonStrictly(absPath), absPath)
}

/** STRICT read-modify-write — the ONE way to write a JSON file based on a prior read, taken
 *  under that file's own lock so the read and the write cannot be split by a sibling writer and
 *  a caller cannot forget to serialize. Absent is a fact: with `seedOnAbsent` the mutation starts
 *  from the seed (first-run), without it a missing file is a `fail`. Unreadable is ignorance: any
 *  other read failure (an evicted iCloud placeholder, a corrupt file) is a `fail` and NO write
 *  happens — never a fallback-to-empty clobber.
 *
 *  The lock is not reentrant, so calling this from inside a `serializeOnFile` on the same path is
 *  refused rather than hung — see `io/fileLock.ts`. A caller needing a span wider than the write,
 *  or a schema-validated read, holds its own lock over `readSidecar`/`writeSidecar` instead. */
export function rmwJsonStrict(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
  seedOnAbsent?: () => Record<string, unknown>,
  /** Adjudicates a file that parses to nothing usable, under the lock, before the seed applies —
   *  never an unreadable one, which still fails with no write. */
  onCorrupt?: (absPath: string) => Promise<void>,
): Promise<Result<Record<string, unknown>>> {
  return serializeOnFile(absPath, async () => {
    const read = await readJsonStrictly(absPath)
    let base: Record<string, unknown>
    if (read.kind === 'ok') base = read.value
    else if (read.kind === 'absent' && seedOnAbsent) base = seedOnAbsent()
    else if (read.kind === 'corrupt' && onCorrupt && seedOnAbsent) {
      await onCorrupt(absPath)
      base = seedOnAbsent()
    } else return strictResult(read, absPath)
    const next = mutate(base)
    await writeJson(absPath, next)
    return ok(next)
  })
}

/** Rewrite ONE page under its file lock, reading FRESH inside the lock so a concurrent
 *  cell-write is never clobbered by a stale pre-read. `rewrite` maps current content → next
 *  content, or null to leave the page untouched. An unreadable file is skipped. Returns
 *  whether the page was written. The page keeps its modification time — a rewrite is never the
 *  user's edit of that page. */
export function rewritePageSerialized(
  file: string,
  rewrite: (content: string) => string | null,
): Promise<boolean> {
  return serializeOnFile(file, async () => {
    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      return false
    }
    const next = rewrite(content)
    if (next === null) return false
    await rewritePreservingTimes(file, next)
    return true
  })
}

/** Read a file's text, or null if it's missing or unreadable. The text-side analog of
 *  `readJsonObject`, for the walks that skip a page they can't read rather than failing the
 *  whole fan-out. */
export async function readTextOrNull(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, 'utf8')
  } catch {
    return null
  }
}

/** Read + JSON-parse a file to a plain object, or null if missing / unreadable / not an
 *  object. READ PATH ONLY — null conflates absent with unreadable, so a write based on it
 *  would clobber a file it merely failed to read; anything that writes back goes through
 *  `rmwJsonStrict`. */
export async function readJsonObject(absPath: string): Promise<Record<string, unknown> | null> {
  try {
    const v = parseJsonText(await readFile(absPath, 'utf8'))
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}

/** True when a path exists. The one owner of the stat-as-existence check. */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}
