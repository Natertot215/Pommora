// Module state, not store state — none of it is render state, and it must survive React remounts
// while dying with the session. Two stores live here. The per-tab entries are written by a page
// surface at unmount — editorState, scrollTop, and the page's detail with its live body under
// the tab that holds it (a capture under an already-closed tabId leaves one inert entry — tab ids
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

/** LRU by Map insertion order — every write re-inserts, so `.keys().next()` is always the stalest. */
function trimToCap<V>(map: Map<string, V>, cap: number): void {
  while (map.size > cap) {
    const oldest = map.keys().next().value
    if (oldest === undefined) break
    map.delete(oldest)
  }
}

export function captureWarm(tabId: string, navKey: string, patch: Partial<WarmEntry>): void {
  let tabMap = cache.get(tabId)
  if (!tabMap) {
    tabMap = new Map()
    cache.set(tabId, tabMap)
  }
  const merged = { ...tabMap.get(navKey), ...patch }
  tabMap.delete(navKey)
  tabMap.set(navKey, merged)
  trimToCap(tabMap, WARM_CAP_PER_TAB)
}

export function readWarm(tabId: string, navKey: string): WarmEntry | undefined {
  return cache.get(tabId)?.get(navKey)
}

/** Beyond this many pages, the stalest embed detail goes cold. */
const DETAIL_CAP = 40

const detailByPath = new Map<string, PageDetail>()

export function cachePageDetail(detail: PageDetail): void {
  detailByPath.delete(detail.path)
  detailByPath.set(detail.path, detail)
  trimToCap(detailByPath, DETAIL_CAP)
}

export function readPageDetail(path: string): PageDetail | undefined {
  return detailByPath.get(path)
}

const inFlight = new Map<string, Promise<PageDetail | null>>()

/** The one fetch for a path — concurrent callers (the preview's embed and inspector mount in the
 *  same frame) share a single openPage round-trip. A landed detail is cached; a failed open
 *  resolves null. A drop or clear mid-flight disowns the fetch: its caller still gets the read,
 *  but the landing can't seed the cache with a pre-write or previous-nexus detail. */
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

/** Drop every warm `pageDetail` captured for `path`, across all tabs — a frontmatter fact changed
 *  outside the open copy, and a warm return would resurrect the pre-write value. Editor state and
 *  scroll stay warm; only the detail refetches. */
export function dropWarmDetail(path: string): void {
  for (const tabMap of cache.values())
    for (const entry of tabMap.values())
      if (entry.pageDetail?.path === path) delete entry.pageDetail
  detailByPath.delete(path)
  inFlight.delete(path)
}

export function dropWarmTab(tabId: string): void {
  cache.delete(tabId)
}

// A surface unmounting because of a clear captures after it — the generation lets it tell.
let generation = 0
export const warmGeneration = (): number => generation

export function clearWarm(): void {
  cache.clear()
  detailByPath.clear()
  inFlight.clear()
  generation++
}
