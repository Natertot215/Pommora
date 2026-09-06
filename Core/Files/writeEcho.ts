const recent = new Map<string, number>()
const WINDOW_MS = 2000
// Descendant (prefix) suppression gets a tighter window: a folder rename's child echoes all land within chokidar's settle pipeline (~400ms), while every prefix-suppressed millisecond is also a blind spot for a genuine EXTERNAL write into that folder.
const PREFIX_WINDOW_MS = 800

export function recordWrite(absPath: string): void {
  recent.set(absPath, Date.now())
  if (recent.size > 256) {
    const cutoff = Date.now() - WINDOW_MS
    for (const [p, t] of recent) if (t < cutoff) recent.delete(p)
  }
}

export function isRecentWrite(absPath: string): boolean {
  const now = Date.now()
  const t = recent.get(absPath)
  if (t !== undefined) {
    if (now - t <= WINDOW_MS) return true
    recent.delete(absPath)
  }
  for (const [p, tp] of recent) {
    if (now - tp > PREFIX_WINDOW_MS) continue
    if (absPath.startsWith(`${p}/`)) return true
  }
  return false
}
