// Module state, not store state — none of it is render state, and it must survive React remounts
// while dying with the session. Two stores live here. The per-tab entries have two writers sharing
// one key: the store captures pageDetail at switch-initiation; the editor captures editorState/
// scrollTop at unmount (a capture under an already-closed tabId leaves one inert entry — tab ids
// are never reused — that the nexus-switch clear reaps). The PATH-KEYED detail slot serves embed
// rehydration: written on fetch and written THROUGH by the shared save scheduler, so a returning
// tile always seeds on the newest body from any host — the per-tab snapshots can't serve that
// (their body freshness lives in serialized editor state, which embeds deliberately don't keep).

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

/** Beyond this many pages, the stalest embed detail goes cold. */
const DETAIL_CAP = 40

const detailByPath = new Map<string, PageDetail>()

/** LRU like the tab maps: every write re-inserts. */
export function cachePageDetail(detail: PageDetail): void {
  detailByPath.delete(detail.path)
  detailByPath.set(detail.path, detail)
  while (detailByPath.size > DETAIL_CAP) {
    const oldest = detailByPath.keys().next().value
    if (oldest === undefined) break
    detailByPath.delete(oldest)
  }
}

export function readPageDetail(path: string): PageDetail | undefined {
  return detailByPath.get(path)
}

/** The save scheduler's write-through — the slot's body must never lag a pending write, or a
 *  remounting tile would seed on pre-edit prose and the next keystroke would save it back. */
export function writeThroughBody(path: string, body: string): void {
  const d = detailByPath.get(path)
  if (d) cachePageDetail({ ...d, body })
}

export function dropPageDetail(path: string): void {
  detailByPath.delete(path)
}

/** Drop every warm `pageDetail` captured for `path`, across all tabs — a frontmatter fact changed
 *  outside the open copy, and a warm return would resurrect the pre-write value. Editor state and
 *  scroll stay warm; only the detail refetches. */
export function dropWarmDetail(path: string): void {
  for (const tabMap of cache.values())
    for (const entry of tabMap.values()) if (entry.pageDetail?.path === path) delete entry.pageDetail
  detailByPath.delete(path)
}

export function dropWarmTab(tabId: string): void {
  cache.delete(tabId)
}

export function clearWarm(): void {
  cache.clear()
  detailByPath.clear()
}
