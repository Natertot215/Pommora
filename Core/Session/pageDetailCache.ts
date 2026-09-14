// The path-keyed page-detail store — module state, seeded by every landed page and written through by the shared save scheduler so a returning reader always sees the newest body.
import { useSyncExternalStore } from 'react'
import { capSet } from '@pommora/uix/Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { clearWarm, dropWarmDetail } from '../Navigation/warmTabs'
import { host } from '../Platform/dialer'

const DETAIL_CAP = 50

const detailByPath = new Map<string, PageDetail>()
const baseByPath = new Map<string, { text: string; hash: string }>()

const landingListeners = new Map<string, Set<() => void>>()

export function subscribeLanding(path: string, fn: () => void): () => void {
  const fns = landingListeners.get(path) ?? new Set<() => void>()
  landingListeners.set(path, fns)
  fns.add(fn)
  return () => {
    fns.delete(fn)
    if (fns.size === 0) landingListeners.delete(path)
  }
}

export function notifyLanding(path: string): boolean {
  const fns = landingListeners.get(path)
  if (!fns?.size) return false
  for (const fn of fns) fn()
  return true
}

const seat = (detail: PageDetail): void => capSet(detailByPath, detail.path, detail, DETAIL_CAP)

export function cachePageDetail(detail: PageDetail): void {
  seat(detail)
  if (!landingListeners.get(detail.path)?.size)
    baseByPath.set(detail.path, { text: detail.body, hash: detail.bodyHash })
}

export const readBodyBase = (path: string): { text: string; hash: string } | null =>
  baseByPath.get(path) ?? null

export function setBodyBase(path: string, base: { text: string; hash: string }): void {
  baseByPath.set(path, base)
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
  if (d) seat({ ...d, body })
}

export function dropDetailsWhere(stale: (path: string) => boolean): void {
  for (const path of [...detailByPath.keys()]) if (stale(path)) dropCacheDetail(path)
}

export function dropPageDetail(path: string): void {
  detailByPath.delete(path)
  baseByPath.delete(path)
  inFlight.delete(path)
}

/** A warm return would resurrect the pre-write value. Editor state and scroll stay warm; only the detail refetches. */
export function dropCacheDetail(path: string): void {
  dropWarmDetail(path)
  detailByPath.delete(path)
  inFlight.delete(path)
}

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
  baseByPath.clear()
  inFlight.clear()
  bodyEpochs.clear()
  for (const fn of epochListeners) fn()
}
