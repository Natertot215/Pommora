// The capture gate: a shot is a full-window capture + a SYNCED write, and warm tab-switching is
// the highest-frequency interaction — so an entity re-shoots only when its shown content actually
// changed since its last shot. Pages mark on their current body text (the live buffer when it's
// theirs); containers mark on the tree identity (stabilize keeps it for echoes, structural changes
// mint a new one). Session-scoped; cleared on a nexus switch so keys can't collide across nexuses.
// Store-free, so the store can reach the eviction without importing the hook that reads it back.
export const captured = new Map<string, unknown>()
let nexus: string | null = null
export function scopeCaptured(id: string | null): void {
  if (nexus === id) return
  captured.clear()
  nexus = id
}

/** Forget markers for entities no longer in the live set (their thumbnails are being evicted as
 *  orphans) — a marker outliving its file would block the re-shoot forever, leaving a permanent
 *  placeholder. */
export function dropCapturedOutside(live: ReadonlySet<string>): void {
  for (const key of captured.keys()) if (!live.has(key)) captured.delete(key)
}
