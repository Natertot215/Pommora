import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  applyViewPatch,
  type EntryKey,
  foldView,
  pickView,
  type SavedView,
  slotsOf,
  type ViewPatch,
} from '../views'
import { same } from '../../Files/stableJson'
import { fault, ok, type Result } from '../../Contract/result'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import { sameItems } from '@pommora/uix/Utilities/same'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { emitter } from '@pommora/uix/Utilities/subscribable'
import type { OrderRequest } from '../../Nexus/mutateRequest'
import { reportRefusal } from '../../Interface/Notifications/notifications'
import { dialer } from '../../Platform/dialer'
import { useViewTileScope } from '../ViewTileScope'
import { mutateAhead, refusedDrop } from './paintAhead'

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
const restaged = emitter()
const restage = (entry: Pending, staged: Staged): void => {
  if (staged === entry.staged) return
  entry.staged = staged
  restaged.emit()
}
const keyOf = (sourceId: string, viewId: string): string => `${sourceId}\0${viewId}`

export function useLiveView(sourceId: string, view: SavedView): SavedView {
  const key = keyOf(sourceId, view.id)
  const latest = useLatest(view)
  const staged = useSyncExternalStore(restaged.subscribe, () => pending.get(key)?.staged ?? NOTHING)
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

function stageView(sourceId: string, view: SavedView, patch: ViewPatch): SavedView {
  const live = readLiveView(sourceId, view)
  const entry = pending.get(keyOf(sourceId, view.id))
  if (entry) restage(entry, stageOver(entry.staged, entry.base, patch))
  return applyViewPatch(live, patch)
}

/** Takes back this patch's own stage alone, so a stage made over it since keeps painting. */
function unstageView(sourceId: string, viewId: string, patch: ViewPatch): void {
  const entry = pending.get(keyOf(sourceId, viewId))
  if (!entry) return
  const next = { ...entry.staged }
  for (const [key, value] of slotsOf(patch)) {
    const seen = next[key]?.seen ?? []
    let at = seen.length - 1
    while (at > 0 && !same(seen[at], value)) at--
    if (at <= 0) continue
    const kept = [...seen.slice(0, at), ...seen.slice(at + 1)]
    if (kept.length > 1) next[key] = { value: kept[kept.length - 1], seen: kept }
    else delete next[key]
  }
  restage(entry, next)
}

export function useActiveView(source: CollectionNode | SetNode): SavedView {
  // Inside a view embed the tile payload IS the view; the container's own choice doesn't reach it.
  const scope = useViewTileScope()
  return useLiveView(source.id, scope ? scope.view : pickView(source))
}

const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const

export type ViewWriteOpts = { viewState?: boolean }

const pickViewState = (patch: ViewPatch): ViewPatch =>
  Object.fromEntries(VIEW_STATE_KEYS.filter((k) => k in patch).map((k) => [k, patch[k]]))

const VIEW_CONFIG_LOCKED = 'The view configuration is locked on this embed.'

export function useSaveView(
  source: CollectionNode | SetNode,
): (view: SavedView, patch: ViewPatch, opts?: ViewWriteOpts) => Promise<Result<{ id: string }>> {
  const scope = useViewTileScope()
  const write = async (
    view: SavedView,
    patch: ViewPatch,
    opts?: ViewWriteOpts,
  ): Promise<Result<{ id: string }>> => {
    if (!scope) {
      const base = stageView(source.id, view, patch)
      const r = await dialer().ask('views:save', source.path, source.kind, base, patch)
      if (!r.ok) unstageView(source.id, view.id, patch)
      return r
    }
    // A locked tile refuses a config write but still folds a state-only one, so a refused config override can't ride in on the state it's allowed.
    const allowed = !scope.locked ? patch : opts?.viewState ? pickViewState(patch) : null
    if (!allowed) return fault(VIEW_CONFIG_LOCKED)
    stageView(source.id, view, allowed)
    scope.persist(allowed)
    return ok({ id: view.id })
  }
  // A refusal reaches the user here, so no caller reports it again.
  return (view, patch, opts) =>
    write(view, patch, opts).then((r) => {
      reportRefusal(r)
      return r
    })
}

const priorSlotOf = (prior: unknown, now: unknown, id: string): string[] | undefined => {
  if (!Array.isArray(prior) || !Array.isArray(now)) return undefined
  const at = prior.indexOf(id)
  if (at < 0) return undefined
  const placed = nextOrder(now, id, prior.slice(at + 1).find((x) => now.includes(x)) ?? null)
  return sameItems(placed, now) ? undefined : placed
}

type Persist = (patch: ViewPatch, opts?: ViewWriteOpts) => Promise<Result<unknown>>

export function dropIO(
  { id, name }: { id: string; name: string },
  {
    source,
    view,
    persistView: persist,
  }: { source: { id: string }; view: SavedView; persistView: Persist },
): {
  persistView: Persist
  mutate: (req: OrderRequest) => Promise<boolean>
  /** Painted at once, saved once `landed` as the view then shows it, so a write composed on it since stands; a refusal of either takes the stage back, and returns the row to its prior slot where a write composed over the stage had carried it. */
  persistAfter: (patch: ViewPatch, landed: Promise<boolean>, opts?: ViewWriteOpts) => void
} {
  const persistView: Persist = (patch, opts) =>
    persist(patch, opts).then((r) => {
      refusedDrop(r.ok, name)
      return r
    })
  return {
    persistView,
    mutate: (req) => mutateAhead(req, name),
    persistAfter: (patch, landed, opts) => {
      stageView(source.id, view, patch)
      void landed.then(async (wrote) => {
        const live = readLiveView(source.id, view)
        const shown = Object.fromEntries(
          Object.keys(patch).map((k) => [k, live[k as keyof SavedView]]),
        )
        if (wrote && (await persistView(shown, opts)).ok) return
        unstageView(source.id, view.id, patch)
        const after = readLiveView(source.id, view)
        const back = Object.fromEntries(
          Object.keys(patch).flatMap((k) => {
            const slot = priorSlotOf(view[k as keyof SavedView], after[k as keyof SavedView], id)
            return slot ? [[k, slot]] : []
          }),
        )
        if (Object.keys(back).length) void persist(back, opts)
      })
    },
  }
}
