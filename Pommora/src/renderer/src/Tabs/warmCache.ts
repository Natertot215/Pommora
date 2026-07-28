// Module state, not store state — none of it is render state, and it must survive React remounts
// while dying with the session. Two writers share one key: the store captures pageDetail at
// switch-initiation; the editor captures editorState/scrollTop at unmount. A capture landing under
// an already-closed tabId leaves one inert entry (tab ids are never reused) that the nexus-switch
// clear reaps.

import type { PageDetail } from '@shared/types'

export interface WarmEntry {
  /** `EditorState.toJSON({ history: historyField })` payload — opaque here, parsed only by the seam. */
  editorState?: unknown
  scrollTop?: number
  pageDetail?: PageDetail
}

/** Beyond this many entries deep, a Back/Forward restore goes cold. */
const WARM_CAP_PER_TAB = 20

const cache = new Map<string, Map<string, WarmEntry>>()

/** LRU by Map insertion order — every capture re-inserts, so `.keys().next()` is always the stalest. */
export function captureWarm(tabId: string, navKey: string, patch: Partial<WarmEntry>): void {
  let tabMap = cache.get(tabId)
  if (!tabMap) {
    tabMap = new Map()
    cache.set(tabId, tabMap)
  }
  const merged = { ...tabMap.get(navKey), ...patch }
  tabMap.delete(navKey)
  tabMap.set(navKey, merged)
  while (tabMap.size > WARM_CAP_PER_TAB) {
    const oldest = tabMap.keys().next().value
    if (oldest === undefined) break
    tabMap.delete(oldest)
  }
}

export function readWarm(tabId: string, navKey: string): WarmEntry | undefined {
  return cache.get(tabId)?.get(navKey)
}

export function dropWarmTab(tabId: string): void {
  cache.delete(tabId)
}

export function clearWarm(): void {
  cache.clear()
}
