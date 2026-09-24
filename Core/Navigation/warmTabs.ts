// Module state, not store state: it survives React remounts while dying with the session.
import { capSet } from '@pommora/uix/Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { fenceWarm, type WarmSeam } from '../MarkdownPM/warmSeam'

interface CacheEntry {
  editorState?: unknown
  scrollTop?: number
  pageDetail?: PageDetail
}

const CACHE_CAP_PER_OWNER = 50

// Every surface that returns an editor warm — a main tab, a window tab, the glance, an embed — keeps its entries under one owner here, so one clear reaches them all.
const cache = new Map<string, Map<string, CacheEntry>>()

export function captureCache(owner: string, entity: string, patch: Partial<CacheEntry>): void {
  const entries = cache.get(owner) ?? new Map<string, CacheEntry>()
  cache.set(owner, entries)
  capSet(entries, entity, { ...entries.get(entity), ...patch }, CACHE_CAP_PER_OWNER)
}

export function readCache(owner: string, entity: string): CacheEntry | undefined {
  return cache.get(owner)?.get(entity)
}

export function dropCacheOwner(owner: string): void {
  cache.delete(owner)
}

export function dropCacheEntry(owner: string, entity: string): void {
  cache.get(owner)?.delete(entity)
}

/** A warm return would otherwise resurrect the pre-write value; editor state and scroll stay warm. */
export function dropWarmDetail(path: string): void {
  for (const entries of cache.values())
    for (const entry of entries.values())
      if (entry.pageDetail?.path === path) delete entry.pageDetail
}

// A surface unmounting because of a clear captures after it — the generation lets it tell.
let generation = 0
export const cacheGeneration = (): number => generation

export function clearWarm(): void {
  cache.clear()
  generation++
}

/** A seam over one owner's entry, fenced against the body `known` names; `live` refuses a capture that trails its owner's close, and a clear since the restore refuses it too. */
export function warmSeamOf(
  owner: string,
  entity: string,
  known: () => string | undefined,
  live: () => boolean = () => true,
): WarmSeam {
  let restoredAt = generation
  return {
    restore: () => {
      restoredAt = generation
      const entry = readCache(owner, entity)
      const kept = fenceWarm(entry, known())
      if (entry && !kept) dropCacheEntry(owner, entity)
      return kept
    },
    capture: (state) => {
      if (restoredAt === generation && live()) captureCache(owner, entity, state)
    },
  }
}

// Dev-only CDP probe (the store's __pommora twin) — lets a headless drive assert warm entries.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __pommoraCache: unknown }).__pommoraCache = cache
}
