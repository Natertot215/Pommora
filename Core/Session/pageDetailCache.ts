// The path-keyed page-detail store — module state, seeded by every landed page and written through by the shared save scheduler so a returning reader always sees the newest body.
import { useSyncExternalStore } from 'react'
import { capSet } from '@pommora/uix/Utilities/capMap'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { type Result, valueOr } from '@pommora/core/Contract/result'
import { clearWarm, dropWarmDetail } from '../Navigation/warmTabs'
import { host } from '../Platform/dialer'

const DETAIL_CAP = 50

const detailByPath = new Map<string, PageDetail>()
const baseByPath = new Map<string, { text: string; hash: string }>()

const seat = (detail: PageDetail): void => capSet(detailByPath, detail.path, detail, DETAIL_CAP)

export function cachePageDetail(detail: PageDetail): void {
  seat(detail)
  // A held page's base moves only with its own saves and landings, which merge against the base before it.
  if (!heads.has(detail.path))
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

/** The newest body this session knows for a path: a pending write's text leads the last one known on disk. */
export const knownBody = (path: string): string | undefined =>
  detailByPath.get(path)?.body ?? baseByPath.get(path)?.text

/** One mounted editor of a path: `seq` and `basis` name the head it last held and the text it shows. */
export interface BodyMount {
  seq: number
  basis: string
  /** Applies the body while the editor still shows its basis; false leaves it behind, to merge on its next keystroke. */
  follow: (body: string) => boolean
}

// Every mount of a path shares one head, the newest body any of them typed, so no mount's save can carry text older than another's.
type BodyHead = { seq: number; text: string }
const heads = new Map<string, BodyHead & { mounts: Set<BodyMount> }>()

export const bodyHead = (path: string): BodyHead | undefined => heads.get(path)

const catchUp = (mount: BodyMount, head: BodyHead): void => {
  if (mount.seq === head.seq || !mount.follow(head.text)) return
  mount.seq = head.seq
  mount.basis = head.text
}

/** A mount seeded behind the head follows it at once. */
export function attachBody(path: string, mount: BodyMount, seed: string): () => void {
  const head = heads.get(path) ?? { seq: 0, text: knownBody(path) ?? seed, mounts: new Set() }
  heads.set(path, head)
  head.mounts.add(mount)
  mount.seq = -1
  mount.basis = seed
  catchUp(mount, head)
  return () => {
    head.mounts.delete(mount)
    if (!head.mounts.size && heads.get(path) === head) heads.delete(path)
  }
}

/** `shown` is the publisher's own text when a merge put more on the head than its editor holds yet, which leaves it behind until it follows. */
export function publishBody(path: string, mount: BodyMount, body: string, shown: string): void {
  const head = advanceHead(path, body)
  if (!head) return
  mount.seq = body === shown ? head.seq : -1
  mount.basis = shown
}

export function followBody(path: string): void {
  const head = heads.get(path)
  if (head) for (const mount of head.mounts) catchUp(mount, head)
}

/** Text that arrived from outside every mount becomes the head, leaving each of them behind it. */
export function advanceHead(path: string, text: string): BodyHead | undefined {
  const head = heads.get(path)
  if (!head) return
  head.seq += 1
  head.text = text
  return head
}

const inFlight = new Map<string, Promise<Result<PageDetail>>>()

/** Concurrent callers share a single `page:open` round-trip. A drop or clear mid-flight disowns the fetch: its caller still gets the read, but the landing can't seed the cache with a pre-write or previous-nexus detail. */
export function fetchPageResult(path: string): Promise<Result<PageDetail>> {
  const pending = inFlight.get(path)
  if (pending) return pending
  const p: Promise<Result<PageDetail>> = host()
    .ask('page:open', path)
    .then((r) => {
      const owned = inFlight.get(path) === p
      if (owned) inFlight.delete(path)
      if (r.ok && owned) cachePageDetail(r.value)
      return r
    })
  inFlight.set(path, p)
  return p
}

export const fetchPageDetail = (path: string): Promise<PageDetail | null> =>
  fetchPageResult(path).then((r) => valueOr(r, null))

/** The slot's body must never lag a pending write, or a remounting tile would seed on pre-edit prose and the next keystroke would save it back. */
export function writeThroughBody(path: string, body: string): void {
  const d = detailByPath.get(path)
  if (d) seat({ ...d, body })
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

/** A replaced body is the head from here: a mount remounting in a later commit must not follow the text it replaced. */
export function bumpBodyEpoch(path: string): void {
  const text = knownBody(path)
  if (text !== undefined) advanceHead(path, text)
  bodyEpochs.set(path, (bodyEpochs.get(path) ?? 0) + 1)
  for (const fn of epochListeners) fn()
}

function subscribeBodyEpoch(fn: () => void): () => void {
  epochListeners.add(fn)
  return () => epochListeners.delete(fn)
}

export const useBodyEpoch = (path: string): number =>
  useSyncExternalStore(subscribeBodyEpoch, () => bodyEpochs.get(path) ?? 0)

export function clearCache(): void {
  clearWarm()
  detailByPath.clear()
  inFlight.clear()
  bodyEpochs.clear()
  for (const fn of epochListeners) fn()
  baseByPath.clear()
  heads.clear()
}
