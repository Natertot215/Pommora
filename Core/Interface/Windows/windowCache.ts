// Module state, never render state: tab ids re-mint at every summon/restore, so the map lives and dies with the open window.

export interface WindowCacheEntry {
  editorState?: unknown
  scrollTop?: number
  bodyScrollTop?: number
}

const cache = new Map<string, WindowCacheEntry>()

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
