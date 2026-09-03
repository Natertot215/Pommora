// Module state, not store state — it survives React remounts while dying with the session. Two
// stores live here: per-tab entries (editorState, scrollTop, live-body detail) written at
// unmount, and a path-keyed detail slot for embed rehydration, written through by the shared save
// scheduler so a returning tile always seeds on the newest body.
import { useSyncExternalStore } from 'react'
import { capSet } from '@renderer/DesignSystem/Util/capMap'
import type { PageDetail } from '@shared/types'

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

/** Beyond this many pages, the stalest embed detail goes cold. */
const DETAIL_CAP = 50

const detailByPath = new Map<string, PageDetail>()

export function cachePageDetail(detail: PageDetail): void {
  capSet(detailByPath, detail.path, detail, DETAIL_CAP)
}

export function readPageDetail(path: string): PageDetail | undefined {
  return detailByPath.get(path)
}

const inFlight = new Map<string, Promise<PageDetail | null>>()

/** The one fetch for a path — concurrent callers share a single openPage round-trip. A drop or
 *  clear mid-flight disowns the fetch: its caller still gets the read, but the landing can't seed
 *  the cache with a pre-write or previous-nexus detail. */
export function fetchPageDetail(path: string): Promise<PageDetail | null> {
  const pending = inFlight.get(path)
  if (pending) return pending
  const p: Promise<PageDetail | null> = window.nexus.openPage(path).then((r) => {
    const owned = inFlight.get(path) === p
    if (owned) inFlight.delete(path)
    if (!r.ok) return null
    if (owned) cachePageDetail(r.value)
    return r.value
  })
  inFlight.set(path, p)
  return p
}

/** The save scheduler's write-through — the slot's body must never lag a pending write, or a
 *  remounting tile would seed on pre-edit prose and the next keystroke would save it back. */
export function writeThroughBody(path: string, body: string): void {
  const d = detailByPath.get(path)
  if (d) cachePageDetail({ ...d, body })
}

export function dropPageDetail(path: string): void {
  detailByPath.delete(path)
  inFlight.delete(path)
}

/** Drop every warm `pageDetail` captured for `path` — a warm return would resurrect the pre-write
 *  value. Editor state and scroll stay warm; only the detail refetches. */
export function dropCacheDetail(path: string): void {
  for (const tabMap of cache.values())
    for (const entry of tabMap.values())
      if (entry.pageDetail?.path === path) delete entry.pageDetail
  detailByPath.delete(path)
  inFlight.delete(path)
}

export function dropCacheTab(tabId: string): void {
  cache.delete(tabId)
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

// A body replaced from outside the editor bumps its path's epoch; every host keyed on it remounts.
const bodyEpochs = new Map<string, number>()
const epochListeners = new Set<() => void>()

export function bumpBodyEpoch(path: string): void {
  bodyEpochs.set(path, (bodyEpochs.get(path) ?? 0) + 1)
  for (const fn of epochListeners) fn()
}

export const readBodyEpoch = (path: string): number => bodyEpochs.get(path) ?? 0

export function subscribeBodyEpoch(fn: () => void): () => void {
  epochListeners.add(fn)
  return () => epochListeners.delete(fn)
}

export const useBodyEpoch = (path: string): number =>
  useSyncExternalStore(subscribeBodyEpoch, () => readBodyEpoch(path))

// A surface unmounting because of a clear captures after it — the generation lets it tell.
let generation = 0
export const cacheGeneration = (): number => generation

export function clearCache(): void {
  cache.clear()
  detailByPath.clear()
  inFlight.clear()
  bodyEpochs.clear()
  for (const fn of epochListeners) fn()
  generation++
}
