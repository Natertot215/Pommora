// The path-keyed page-detail slot for embed rehydration — module state, written through by the shared save scheduler so a returning tile always seeds on the newest body.
import { useSyncExternalStore } from 'react'
import { capSet } from '../../UIX/Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { clearWarm, dropWarmDetail } from '../Navigation/warmTabs'
import { host } from '../Platform/dialer'

const DETAIL_CAP = 50

const detailByPath = new Map<string, PageDetail>()

export function cachePageDetail(detail: PageDetail): void {
  capSet(detailByPath, detail.path, detail, DETAIL_CAP)
}

export function readPageDetail(path: string): PageDetail | undefined {
  return detailByPath.get(path)
}

const inFlight = new Map<string, Promise<PageDetail | null>>()

/** Concurrent callers share a single openPage round-trip. A drop or clear mid-flight disowns the fetch: its caller still gets the read, but the landing can't seed the cache with a pre-write or previous-nexus detail. */
export function fetchPageDetail(path: string): Promise<PageDetail | null> {
  const pending = inFlight.get(path)
  if (pending) return pending
  const p: Promise<PageDetail | null> = host()
    .ask('page:open', path)
    .then((r) => {
      const owned = inFlight.get(path) === p
      if (owned) inFlight.delete(path)
      if (!r.ok) return null
      if (owned) cachePageDetail(r.value)
      return r.value
    })
  inFlight.set(path, p)
  return p
}

/** The slot's body must never lag a pending write, or a remounting tile would seed on pre-edit prose and the next keystroke would save it back. */
export function writeThroughBody(path: string, body: string): void {
  const d = detailByPath.get(path)
  if (d) cachePageDetail({ ...d, body })
}

export function dropPageDetail(path: string): void {
  detailByPath.delete(path)
  inFlight.delete(path)
}

/** A warm return would resurrect the pre-write value. Editor state and scroll stay warm; only the detail refetches. */
export function dropCacheDetail(path: string): void {
  dropWarmDetail(path)
  detailByPath.delete(path)
  inFlight.delete(path)
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

export function clearCache(): void {
  clearWarm()
  detailByPath.clear()
  inFlight.clear()
  bodyEpochs.clear()
  for (const fn of epochListeners) fn()
}
