// Module state, not store state: it survives React remounts while dying with the session.
import { capSet } from '../../UIX/Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'

interface CacheEntry {
  editorState?: unknown
  scrollTop?: number
  pageDetail?: PageDetail
}

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

/** A warm return would otherwise resurrect the pre-write value; editor state and scroll stay warm. */
export function dropWarmDetail(path: string): void {
  for (const tabMap of cache.values())
    for (const entry of tabMap.values())
      if (entry.pageDetail?.path === path) delete entry.pageDetail
}

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
