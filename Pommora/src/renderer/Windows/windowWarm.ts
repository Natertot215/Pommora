// Module state, never render state. Tab ids re-mint at every summon/restore, so the map lives and
// dies with the open window — close/overtake/adopt clear it wholesale, a tab close drops its key.
// A capture landing under an already-closed id leaves one inert entry, reaped by the next clear.

export interface WindowWarmEntry {
  editorState?: unknown
  /** The editor's INTERNAL scroller — always 0 in the preview (the body owns scroll there). */
  scrollTop?: number
  /** The preview body's scroll — the window captures it per tab (two scrollers, two fields). */
  bodyScrollTop?: number
}

const cache = new Map<string, WindowWarmEntry>()

/** Merge a partial capture — the editor (state) and the window (body scroll) write under one key. */
export function captureWindowWarm(tabId: string, patch: WindowWarmEntry): void {
  cache.set(tabId, { ...cache.get(tabId), ...patch })
}

export function readWindowWarm(tabId: string): WindowWarmEntry | undefined {
  return cache.get(tabId)
}

export function dropWindowWarm(tabId: string): void {
  cache.delete(tabId)
}

export function clearWindowWarm(): void {
  cache.clear()
}

// Dev-only CDP probe (the store's __pommora twin) — lets a headless drive assert warm entries.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __pommoraWarm: unknown }).__pommoraWarm = cache
}
