// The single owner of safe writes for the data layer. Every write goes to a temp
// sibling then atomically renames over the target (write-file-atomic does the
// temp + fsync + rename), so a crash can never leave a half-written file. Atomic on
// the SAME volume only — temps are siblings of the target, so a nexus stays intact.

import writeFileAtomic from 'write-file-atomic'
import { readFile, rename, mkdir, stat } from 'node:fs/promises'
import { join, basename, dirname, relative, isAbsolute } from 'node:path'
import { isPlainObject } from '@shared/propertyValue'
import { fail, ok, type Result } from '@shared/result'
import { recordWrite } from './writeEcho'

/** Atomically write a UTF-8 string to `filePath`. Recorded for watcher echo
 *  suppression — the app's own writes never trigger its own re-walk. */
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  recordWrite(filePath)
  await writeFileAtomic(filePath, data, { encoding: 'utf8' })
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

/** Atomically write a JSON value with stable, sorted keys + a trailing newline. */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteFile(filePath, serializeJson(value))
}

/** STRICT JSON read: a missing file is `not-found`, anything else unreadable/non-object is
 *  `operation-failed` — never a fallback. The read half of `rmwJsonStrict`, exposed for
 *  callers that branch on the failure kind (the registry's seed-vs-unmigrated split). */
export async function readJsonStrict(absPath: string): Promise<Result<Record<string, unknown>>> {
  let raw: string
  try {
    raw = await readFile(absPath, 'utf8')
  } catch (e) {
    const missing = (e as NodeJS.ErrnoException).code === 'ENOENT'
    return fail(missing ? 'not-found' : 'operation-failed', `Unreadable file: ${basename(absPath)}`)
  }
  try {
    const v: unknown = JSON.parse(raw)
    if (!isPlainObject(v))
      return fail('operation-failed', `Not a JSON object: ${basename(absPath)}`)
    return ok(v)
  } catch {
    return fail('operation-failed', `Corrupt JSON: ${basename(absPath)}`)
  }
}

/** STRICT read-modify-write — the ONE way to write a JSON file based on a prior read.
 *  Absent is a fact: with `seedOnAbsent` the mutation starts from the seed (first-run),
 *  without it a missing file is a `fail`. Unreadable is ignorance: any other read failure
 *  (an evicted iCloud placeholder, a corrupt file) is a `fail` and NO write happens —
 *  never a fallback-to-empty clobber. Callers needing serialization wrap this in their
 *  own `serializeOnFile`. */
export async function rmwJsonStrict(
  absPath: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
  seedOnAbsent?: () => Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> {
  const current = await readJsonStrict(absPath)
  let base: Record<string, unknown>
  if (current.ok) base = current.value
  else if (current.error.code === 'not-found' && seedOnAbsent) base = seedOnAbsent()
  else return current
  const next = mutate(base)
  await writeJson(absPath, next)
  return ok(next)
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
    const v: unknown = JSON.parse(await readFile(absPath, 'utf8'))
    return isPlainObject(v) ? v : null
  } catch {
    return null
  }
}


/** Deterministic JSON: object keys sorted recursively, 2-space indent. Byte-stable
 *  across writes so re-saving unchanged data produces identical bytes. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2)
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) out[key] = sortKeys(source[key])
    return out
  }
  return value
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

export const BUNDLE_SUFFIX = '.deleted'

/** The `.trash` directory mirroring the chain a path was deleted from. `.trash` reads as a
 *  shadow of the nexus, so a deleted page shows where it lived. A path that isn't under the
 *  root has no chain to mirror, and following its `..` would write outside the trash entirely —
 *  it lands flat instead. */
async function trashChainDir(nexusRoot: string, absPath: string): Promise<string> {
  const rel = relative(nexusRoot, absPath)
  const chain = rel && !rel.startsWith('..') && !isAbsolute(rel) ? dirname(rel) : '.'
  const dir = join(nexusRoot, '.trash', chain)
  await mkdir(dir, { recursive: true })
  return dir
}

const trashStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

/** The trash's leaf naming, stated once: the stamp, then a de-collision counter once one is
 *  needed, then the name the entity had. Both trash paths de-collide differently — a bundle
 *  claims its folder atomically, a bare file probes — but what they produce reads identically. */
const stampedLeaf = (stamp: string, n: number, base: string): string =>
  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`

/**
 * Create the empty bundle folder a deletion will fill: `<stamp>__<base>.deleted/` under the
 * mirrored chain. Nothing is destroyed — minting is the first half of a delete, and the record
 * lands inside before the artifact moves.
 *
 * The `mkdir` is deliberately NON-recursive so `EEXIST` actually fires: recursive mkdir accepts
 * an existing directory, and two same-instant deletes would then share one bundle.
 */
export async function mintBundle(nexusRoot: string, absSource: string): Promise<string> {
  const dir = await trashChainDir(nexusRoot, absSource)
  const stamp = trashStamp()
  const base = `${basename(absSource)}${BUNDLE_SUFFIX}`
  for (let n = 0; ; n++) {
    const bundle = join(dir, stampedLeaf(stamp, n, base))
    try {
      await mkdir(bundle)
      return bundle
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    }
  }
}

/** Move the artifact into its minted bundle under its ORIGINAL basename — the last step of a
 *  delete, and the settle marker: a content bundle holding no artifact is an incomplete one. */
export async function settleBundle(bundleDir: string, absPath: string): Promise<string> {
  const dest = join(bundleDir, basename(absPath))
  // The source's unlink echo is our own write (the .trash destination is unwatched).
  recordWrite(absPath)
  recordWrite(dest)
  await rename(absPath, dest)
  return dest
}

/** Trash a bare file with no record and no bundle, under a stamped leaf. A markdown-block tile
 *  is not an entity — it has no identity to record and no restore semantics — so it takes this
 *  rather than a bundle. Returns the destination path. */
export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
  recordWrite(absPath)
  const dir = await trashChainDir(nexusRoot, absPath)
  const stamp = trashStamp()
  const base = basename(absPath)
  let dest = join(dir, stampedLeaf(stamp, 0, base))
  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
  await rename(absPath, dest)
  return dest
}
