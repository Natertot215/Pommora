// An entity re-shoots only when its shown content actually changed since its last shot — pages mark on body text, containers on tree identity. Store-free, so the store can reach the eviction without importing the hook that reads it back.
export const captured = new Map<string, unknown>()
let nexus: string | null = null
export function scopeCaptured(id: string | null): void {
  if (nexus === id) return
  captured.clear()
  nexus = id
}

/** A marker outliving its file would block the re-shoot forever, leaving a permanent placeholder. */
export function dropCapturedOutside(live: ReadonlySet<string>): void {
  for (const key of captured.keys()) if (!live.has(key)) captured.delete(key)
}
