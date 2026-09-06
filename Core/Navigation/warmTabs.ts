// The per-tab warm store — module state, not store state: it survives React remounts while dying
// with the session. A Back/Forward return reseeds the editor and its scroll from here.
import { capSet } from '../Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'

export interface CacheEntry {
  /** `EditorState.toJSON({ history: historyField })` payload — opaque here, parsed only by the seam. */
  editorState?: unknown
  scrollTop?: number
  pageDetail?: PageDetail
}

/** Beyond this many entries deep, a Back/Forward restore goes cold. */
const CACHE_CAP_PER_TAB = 50

const cache = new Map<string, Map<string, CacheEntry>>()

export function captureCache(tabId: string, navKey: string, patch: Partial<CacheEntry>): void {
  let tabMap = cache.get(tabId)
  if (!tabMap) {
    tabMap = new Map()
    cache.set(tabId, tabMap)
  }
  const merged = { ...tabMap.get(navKey), ...patch }
  capSet(tabMap, navKey, merged, CACHE_CAP_PER_TAB)
}

export function readCache(tabId: string, navKey: string): CacheEntry | undefined {
  return cache.get(tabId)?.get(navKey)
}

export function dropCacheTab(tabId: string): void {
  cache.delete(tabId)
}

/** Drop every warm `pageDetail` captured for `path` — a warm return would resurrect the pre-write
 *  value. Editor state and scroll stay warm; only the detail refetches. */
export function dropWarmDetail(path: string): void {
  for (const tabMap of cache.values())
    for (const entry of tabMap.values())
      if (entry.pageDetail?.path === path) delete entry.pageDetail
}

/** A warm entry stands only while its doc is the fresh body; a scroll-only entry has no doc to
 *  disagree, and no fresh body means nothing to disagree with. */
export function fenceWarm<E extends { editorState?: unknown }>(
  entry: E | undefined,
  fresh: string | undefined,
): E | undefined {
  if (!entry || fresh === undefined) return entry
  const doc = (entry.editorState as { doc?: unknown } | undefined)?.doc
  return doc === undefined || doc === fresh ? entry : undefined
}

// A surface unmounting because of a clear captures after it — the generation lets it tell.
let generation = 0
export const cacheGeneration = (): number => generation

export function clearWarm(): void {
  cache.clear()
  generation++
}
