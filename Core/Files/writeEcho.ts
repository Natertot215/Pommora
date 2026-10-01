import { machine } from '../Platform/machine'

// A write recorded with its bytes is an echo only while the file still holds them, so an outside write landing inside the window still reaches the watcher; a move or rename, recorded without bytes, is an echo for the whole window.
type Echo = { at: number; hash?: string }
const recent = new Map<string, Echo>()
const WINDOW_MS = 2000
// Descendant (prefix) suppression gets a tighter window: a folder rename's child echoes all land within chokidar's settle pipeline (~400ms), while every prefix-suppressed millisecond is also a blind spot for a genuine EXTERNAL write into that folder.
const PREFIX_WINDOW_MS = 800

interface WriteTap {
  wrote(absPath: string): void
  renamed(absFrom: string, absTo: string): void
}
let tap: WriteTap | null = null

export function setWriteTap(next: WriteTap | null): void {
  tap = next
}

export function recordWrite(absPath: string, content?: string | Uint8Array): void {
  recent.set(absPath, {
    at: Date.now(),
    hash: content === undefined ? undefined : machine().sha256Hex(content),
  })
  if (recent.size > 256) {
    const cutoff = Date.now() - WINDOW_MS
    for (const [p, r] of recent) if (r.at < cutoff) recent.delete(p)
  }
  tap?.wrote(absPath)
}

export const reportRename = (absFrom: string, absTo: string): void => tap?.renamed(absFrom, absTo)

export interface Changed {
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  absPath: string
  written?: string
  own?: { text?: string; held?: boolean }
}

export interface Moved {
  event: 'move'
  absPath: string
  from: string
}

export type FileEvent = Changed | Moved

let ownTap: ((ev: FileEvent) => Promise<void>) | null = null

export function setOwnTap(fn: ((ev: FileEvent) => Promise<void>) | null): void {
  ownTap = fn
}

export const noteOwn = (ev: FileEvent): Promise<void> => ownTap?.(ev) ?? Promise.resolve()

let watchTap: ((ev: Changed) => void) | null = null

export function setWatchTap(fn: ((ev: Changed) => void) | null): void {
  watchTap = fn
}

export function emitWatch(event: Changed['event'], absPath: string): void {
  watchTap?.({ event, absPath })
}

const held = (absPath: string): Echo | undefined => {
  const r = recent.get(absPath)
  if (r === undefined || Date.now() - r.at <= WINDOW_MS) return r
  recent.delete(absPath)
  return undefined
}

/** An echo known without reading the file: a bytes-less record, or a descendant of a folder just moved. */
export function isRecentWrite(absPath: string): boolean {
  const r = held(absPath)
  if (r !== undefined) return r.hash === undefined
  // Only an exact ancestor can prefix-match, so walk absPath's parent directories instead of scanning every record: O(depth) lookups replace the O(N) scan.
  for (
    let slash = absPath.lastIndexOf('/');
    slash > 0;
    slash = absPath.lastIndexOf('/', slash - 1)
  ) {
    const tp = recent.get(absPath.slice(0, slash))
    if (tp !== undefined && Date.now() - tp.at <= PREFIX_WINDOW_MS) return true
  }
  return false
}

/** The hash of the bytes the app just wrote at a path, taken as its event arrives. */
export const writtenHash = (absPath: string): string | undefined => held(absPath)?.hash

/** Drops the events whose file still holds exactly the bytes their arrival named, however late the settle runs. */
export async function dropOwnEchoes<E extends { absPath: string; written?: string }>(
  events: E[],
): Promise<E[]> {
  const kept = await Promise.all(
    events.map(async (e) => {
      if (e.written === undefined) return true
      const bytes = await machine().readBytes(e.absPath)
      return bytes === null || machine().sha256Hex(bytes) !== e.written
    }),
  )
  return events.filter((_, i) => kept[i])
}
