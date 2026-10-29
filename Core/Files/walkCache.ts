import { type FileStat, sameFile, statOrNull } from '../Platform/machine'

// A hit is refused while the parse happened within this window of the file's own mtime — a same-tick edit on a coarse-mtime volume (exFAT/SMB) is invisible to (mtime, size). git's racy-index rule.
const RACY_WINDOW_MS = 2000

type Entry = { stat: FileStat; verifiedAt: number; gen: number; value: unknown }

let cacheRoot: string | null = null
let gen = 0
let forgets = 0
const entries = new Map<string, Entry>()

export function beginWalk(root: string): void {
  if (root !== cacheRoot) {
    entries.clear()
    cacheRoot = root
  }
  gen++
}

export function endWalk(): void {
  for (const [key, e] of entries) if (e.gen < gen) entries.delete(key)
}

export function forgetParse(absPath: string): void {
  entries.delete(absPath)
  forgets++
}

/** Holds `value` as the parse of the file `stat` describes, as a write that knows its own bytes' parse leaves it for the next walk. */
export function rememberParse(absPath: string, stat: FileStat, value: unknown): void {
  entries.set(absPath, { stat, verifiedAt: Date.now(), gen, value })
}

export async function cachedParse<T>(
  absPath: string,
  parse: (stat: FileStat | null) => Promise<T>,
): Promise<T> {
  const forgetsAtStart = forgets
  const s = await statOrNull(absPath)
  if (!s) return parse(null)
  const e = entries.get(absPath)
  if (e && sameFile(e.stat, s) && e.verifiedAt - s.mtimeMs > RACY_WINDOW_MS) {
    e.gen = gen
    return e.value as T
  }
  const value = await parse(s)
  // null is a non-answer (absent OR transiently unreadable) — caching it against a healthy (mtime, size) would serve the failure until the file next changes. A parse that straddled a forget may hold the bytes the forget retired, under the same (mtime, size).
  if (value !== null && forgets === forgetsAtStart)
    entries.set(absPath, { stat: s, verifiedAt: Date.now(), gen, value })
  return value
}
