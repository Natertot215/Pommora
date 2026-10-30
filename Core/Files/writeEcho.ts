// The app's writes and the watcher's events pass through here: the echo records tell the app's writes from outside ones, the own tap lands each landing's files as one batch of events (`Core/Nexus/settle.ts` installs it when imported, so a process that writes without importing the settle reaches neither the tree nor the index), and the write and watch taps feed sync.

import { type FileStat, sameFile, statOrNull } from '../Platform/machine'

// A landing is an echo while its file still holds the stat it answered (`sameFile`), however late its event arrives, until an event finds the file changed, so an outside write reaches the watcher even when it restores the app's bytes. While the file's next landing is in flight, its record keeps the stat the last one answered. A move or rename is an echo for the whole window.
type Echo = { kind: 'move'; at: number } | { kind: 'landing'; stat?: FileStat }
const recent = new Map<string, Echo>()
const WINDOW_MS = 2000
// Descendant (prefix) suppression gets a tighter window: a folder rename's child echoes all land within chokidar's settle pipeline (~400ms), while every prefix-suppressed millisecond is also a blind spot for a genuine EXTERNAL write into that folder.
const PREFIX_WINDOW_MS = 800
let sweepAbove = 256

interface WriteTap {
  wrote(absPath: string): void
  renamed(absFrom: string, absTo: string): void
}
let tap: WriteTap | null = null

export function setWriteTap(next: WriteTap | null): void {
  tap = next
}

// Recorded before the bytes land, so no echo of the landing arrives ahead of its record; `noteOwn` follows the landing, so its event reports the file as it now stands.
export function recordWrite(absPath: string, landing = false): void {
  const last = recent.get(absPath)
  const stat = last?.kind === 'landing' ? last.stat : undefined
  recent.set(absPath, landing ? { kind: 'landing', stat } : { kind: 'move', at: Date.now() })
  if (recent.size > sweepAbove) {
    const cutoff = Date.now() - WINDOW_MS
    for (const [p, r] of recent) if (r.kind === 'move' && r.at < cutoff) recent.delete(p)
    sweepAbove = Math.max(256, 2 * recent.size)
  }
  tap?.wrote(absPath)
}

/** Gives the landing recorded at `absPath` the stat it answered, so its echo is told by that stat. */
export function recordLanding(absPath: string, stat: FileStat): void {
  recent.set(absPath, { kind: 'landing', stat })
}

export const reportRename = (absFrom: string, absTo: string): void => tap?.renamed(absFrom, absTo)

export type ChangeEvent = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

// The app's own event carries the text it wrote and the stat its landing answered, since its writer still holds the file's lock.
export type Changed = { event: ChangeEvent; absPath: string } & (
  | { origin: 'watched'; text?: never; bodyOnly?: never; stat?: never }
  | { origin: 'own'; text?: string; bodyOnly?: boolean; stat?: FileStat }
)

export interface Moved {
  event: 'move'
  absPath: string
  from: string
}

export type FileEvent = Changed | Moved

let ownTap: ((evs: FileEvent[]) => Promise<void>) | null = null

export function setOwnTap(fn: ((evs: FileEvent[]) => Promise<void>) | null): void {
  ownTap = fn
}

export const noteOwn = (...evs: FileEvent[]): Promise<void> => ownTap?.(evs) ?? Promise.resolve()

let watchTap: ((ev: Changed) => void) | null = null

export function setWatchTap(fn: ((ev: Changed) => void) | null): void {
  watchTap = fn
}

export function emitWatch(event: ChangeEvent, absPath: string): void {
  watchTap?.({ event, absPath, origin: 'watched' })
}

const held = (absPath: string): Echo | undefined => {
  const r = recent.get(absPath)
  if (r?.kind !== 'move' || Date.now() - r.at <= WINDOW_MS) return r
  recent.delete(absPath)
  return undefined
}

/** An echo known without a stat: a move's or rename's record, or a descendant of a folder just moved. */
export function isRecentWrite(absPath: string): boolean {
  const r = held(absPath)
  if (r !== undefined) return r.kind === 'move'
  // Only an exact ancestor can prefix-match, so walk absPath's parent directories instead of scanning every record: O(depth) lookups replace the O(N) scan.
  for (
    let slash = absPath.lastIndexOf('/');
    slash > 0;
    slash = absPath.lastIndexOf('/', slash - 1)
  ) {
    const tp = recent.get(absPath.slice(0, slash))
    if (tp?.kind === 'move' && Date.now() - tp.at <= PREFIX_WINDOW_MS) return true
  }
  return false
}

/** Drops the events whose file still holds exactly the stat its landing answered, however late the settle runs; an event that finds the file changed retires that landing's record. */
export async function dropOwnEchoes(events: Changed[]): Promise<Changed[]> {
  const kept = await Promise.all(
    events.map(async (e) => {
      const r = held(e.absPath)
      if (r?.kind !== 'landing' || !r.stat) return true
      if (sameFile(r.stat, await statOrNull(e.absPath))) return false
      if (recent.get(e.absPath) === r) recent.delete(e.absPath)
      return true
    }),
  )
  return events.filter((_, i) => kept[i])
}
