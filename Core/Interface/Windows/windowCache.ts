// Module state, never render state. Tab ids re-mint at every summon/restore, so the map lives and
// dies with the open window — close/overtake/adopt clear it wholesale, a tab close drops its key.
// A capture landing under an already-closed id leaves one inert entry, reaped by the next clear.

export interface WindowCacheEntry {
  editorState?: unknown
  /** The editor's INTERNAL scroller — always 0 in the window (the body owns scroll there). */
  scrollTop?: number
  /** The body's scroll — captured per tab alongside the editor's (two scrollers, two fields). */
  bodyScrollTop?: number
}

const cache = new Map<string, WindowCacheEntry>()

// Merge a partial capture — the editor (state) and the window (body scroll) write under one key.
export function captureWindowCache(tabId: string, patch: WindowCacheEntry): void {
  cache.set(tabId, { ...cache.get(tabId), ...patch })
}

export function readWindowCache(tabId: string): WindowCacheEntry | undefined {
  return cache.get(tabId)
}

export function dropWindowCache(tabId: string): void {
  cache.delete(tabId)
}

export function clearWindowCache(): void {
  cache.clear()
}

// Dev-only CDP probe (the store's __pommora twin) — lets a headless drive assert warm entries.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __pommoraCache: unknown }).__pommoraCache = cache
}
