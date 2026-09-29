import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  applyViewPatch,
  type EntryKey,
  foldView,
  type SavedView,
  slotsOf,
  type ViewPatch,
} from '@pommora/core/Views/views'
import { same } from '@pommora/core/Files/stableJson'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { MutateOutcome } from '@pommora/core/Nexus/mutateRequest'
import { channel } from '@pommora/uix/Utilities/subscribable'
import type { OrderRequest } from '../../Nexus/treePatch'
import { useSession } from '../../Session/store'

interface Slot {
  value: unknown
  seen: unknown[]
}
type Staged = Record<string, Slot>

const stored = (view: SavedView, key: string): unknown => {
  const at = key.indexOf('/')
  return at < 0
    ? view[key as keyof SavedView]
    : (view[key.slice(0, at) as EntryKey] as Record<string, unknown> | undefined)?.[
        key.slice(at + 1)
      ]
}

function settle(staged: Staged, view: SavedView): Staged {
  let next: Staged | null = null
  for (const [key, slot] of Object.entries(staged)) {
    const now = stored(view, key)
    const at = slot.seen.findIndex((s, i) => i > 0 && same(s, now))
    if (at < 0 && same(slot.seen[0], now)) continue
    next ??= { ...staged }
    if (at < 0 || at === slot.seen.length - 1) delete next[key]
    else next[key] = { value: slot.value, seen: slot.seen.slice(at) }
  }
  return next ?? staged
}

function stageOver(staged: Staged, view: SavedView, patch: ViewPatch): Staged {
  const next = { ...staged }
  for (const [key, value] of slotsOf(patch)) {
    if (value === undefined)
      for (const k of Object.keys(next)) if (k.startsWith(`${key}/`)) delete next[k]
    next[key] = { value, seen: [...(staged[key]?.seen ?? [stored(view, key)]), value] }
  }
  return next
}

const NOTHING: Staged = {}

const foldStaged = (view: SavedView, staged: Staged): SavedView =>
  foldView(
    view,
    Object.entries(staged).map(([k, s]) => [k, s.value]),
  )

interface Pending {
  base: SavedView
  staged: Staged
  users: number
}
const pending = new Map<string, Pending>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const restage = (entry: Pending, staged: Staged): void => {
  if (staged === entry.staged) return
  entry.staged = staged
  for (const listener of listeners) listener()
}
const keyOf = (sourceId: string, viewId: string): string => `${sourceId}\0${viewId}`

export function useLiveView(sourceId: string, view: SavedView): SavedView {
  const key = keyOf(sourceId, view.id)
  const latest = useLatest(view)
  const staged = useSyncExternalStore(subscribe, () => pending.get(key)?.staged ?? NOTHING)
  useEffect(() => {
    const entry = pending.get(key) ?? { base: latest.current, staged: NOTHING, users: 0 }
    pending.set(key, entry)
    entry.users++
    return () => {
      if (--entry.users === 0) pending.delete(key)
    }
  }, [key, latest])
  useEffect(() => {
    const entry = pending.get(key)
    if (!entry) return
    entry.base = view
    restage(entry, settle(entry.staged, view))
  }, [key, view])
  return useMemo(() => foldStaged(view, staged), [view, staged])
}

export function readLiveView(sourceId: string, view: SavedView): SavedView {
  const entry = pending.get(keyOf(sourceId, view.id))
  return entry ? foldStaged(entry.base, entry.staged) : view
}

export function stageView(sourceId: string, view: SavedView, patch: ViewPatch): SavedView {
  const live = readLiveView(sourceId, view)
  const entry = pending.get(keyOf(sourceId, view.id))
  if (entry) restage(entry, stageOver(entry.staged, entry.base, patch))
  return applyViewPatch(live, patch)
}

export function unstageView(sourceId: string, viewId: string, patch: ViewPatch): void {
  const entry = pending.get(keyOf(sourceId, viewId))
  if (!entry) return
  const written = new Set(slotsOf(patch).map(([key]) => key))
  restage(entry, Object.fromEntries(Object.entries(entry.staged).filter(([k]) => !written.has(k))))
}

// ── Orders painted ahead ────────────────────────────────────────────────────

const ahead = channel<readonly OrderRequest[]>([])

export const useOrdersAhead = (): readonly OrderRequest[] =>
  useSyncExternalStore(ahead.subscribe, ahead.get)

export function mutateAhead(req: OrderRequest): Promise<MutateOutcome | null> {
  ahead.set([...ahead.get(), req])
  return useSession
    .getState()
    .mutate(req)
    .finally(() => ahead.set(ahead.get().filter((r) => r !== req)))
}
