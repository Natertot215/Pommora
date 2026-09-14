import { setWriteTap } from '../../Files/writeEcho'
import { setWatchTap } from '../../Nexus/watchSettle'
import { manifestAdmits, type WatchScope } from '../../Paths/exclusion'
import { TRASH_DIR } from '../../Paths/nexusPaths'
import { relative } from '../../Paths/posix'

export const DEBOUNCE_MS = 2500

export interface TapSinks {
  onDirty(rels: string[]): void
  onRename(from: string, to: string): void
}

let sinks: TapSinks | null = null
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const batch = new Set<string>()
let flush: ReturnType<typeof setTimeout> | null = null

function deliver(): void {
  flush = null
  const rels = [...batch]
  batch.clear()
  sinks?.onDirty(rels)
}

function schedule(rel: string): void {
  clearTimeout(timers.get(rel))
  timers.set(
    rel,
    setTimeout(() => {
      timers.delete(rel)
      if (flush === null) flush = setTimeout(deliver, 0)
      batch.add(rel)
    }, DEBOUNCE_MS),
  )
}

export function installTap(root: string, scope: WatchScope, next: TapSinks): void {
  sinks = next
  const admits = manifestAdmits(scope)
  const feed = (absPath: string, watched: boolean): void => {
    const rel = relative(root, absPath)
    if (!rel) return
    if (watched && rel.split('/')[0] === TRASH_DIR) return
    if (admits(rel)) schedule(rel)
  }
  setWatchTap((ev) => feed(ev.absPath, true))
  setWriteTap((absPath) => feed(absPath, false))
}

export function reportRename(from: string, to: string): void {
  for (const rel of [from, to]) {
    clearTimeout(timers.get(rel))
    timers.delete(rel)
    batch.delete(rel)
  }
  sinks?.onRename(from, to)
}

export function uninstallTap(): void {
  setWatchTap(null)
  setWriteTap(null)
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  if (flush !== null) clearTimeout(flush)
  flush = null
  batch.clear()
  sinks = null
}

export const dirtyPending = (): Set<string> => new Set(timers.keys())
