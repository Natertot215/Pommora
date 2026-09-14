const recent = new Map<string, number>()
const WINDOW_MS = 2000
// Descendant (prefix) suppression gets a tighter window: a folder rename's child echoes all land within chokidar's settle pipeline (~400ms), while every prefix-suppressed millisecond is also a blind spot for a genuine EXTERNAL write into that folder.
const PREFIX_WINDOW_MS = 800

let tap: ((absPath: string) => void) | null = null

/** The sync client installs itself here to see every path the app writes, the ones the watcher never reports included. */
export function setWriteTap(fn: ((absPath: string) => void) | null): void {
  tap = fn
}

export function recordWrite(absPath: string): void {
  recent.set(absPath, Date.now())
  if (recent.size > 256) {
    const cutoff = Date.now() - WINDOW_MS
    for (const [p, t] of recent) if (t < cutoff) recent.delete(p)
  }
  tap?.(absPath)
}

export function isRecentWrite(absPath: string): boolean {
  const now = Date.now()
  const t = recent.get(absPath)
  if (t !== undefined) {
    if (now - t <= WINDOW_MS) return true
    recent.delete(absPath)
  }
  // Only an exact ancestor can prefix-match, so walk absPath's parent directories instead of scanning every record: O(depth) lookups replace the O(N) scan.
  for (
    let slash = absPath.lastIndexOf('/');
    slash > 0;
    slash = absPath.lastIndexOf('/', slash - 1)
  ) {
    const tp = recent.get(absPath.slice(0, slash))
    if (tp !== undefined && now - tp <= PREFIX_WINDOW_MS) return true
  }
  return false
}
