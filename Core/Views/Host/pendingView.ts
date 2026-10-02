import { useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  applyViewPatch,
  type EntryKey,
  foldView,
  type SavedView,
  slotsOf,
  type ViewPatch,
} from '../views'
import { same } from '../../Files/stableJson'
import type { Result } from '../../Contract/result'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { CollectionNode, NexusTree, SetNode } from '../../Nexus/tree'
import { announceDrag } from '@pommora/uix/Interactions/a11y'
import { channel } from '@pommora/uix/Utilities/subscribable'
import type { OrderRequest } from '../../Nexus/mutateRequest'
import { resolveOrder } from '../../Nexus/order'
import { containerAt, moveNodeInTree, updateNodeInTree } from '../../Nexus/treePatch'
import { basename, relJoin } from '../../Paths/posix'
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
const restaged = channel(0)
const restage = (entry: Pending, staged: Staged): void => {
  if (staged === entry.staged) return
  entry.staged = staged
  restaged.set(restaged.get() + 1)
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

function withChildOrder(
  tree: NexusTree,
  parentPath: string,
  key: 'pageOrder' | 'setOrder',
  order: string[],
): NexusTree | null {
  return updateNodeInTree(tree, parentPath, (parent) => {
    if (parent.kind !== 'collection' && parent.kind !== 'set') return parent
    return key === 'pageOrder'
      ? { ...parent, pageOrder: order, pages: resolveOrder(parent.pages, order) }
      : { ...parent, setOrder: order, sets: resolveOrder(parent.sets ?? [], order) }
  })
}

// A drag's order as the tree holds it once the drag's write lands, shown before then.
function orderInTree(tree: NexusTree, req: OrderRequest): NexusTree | null {
  if (req.op === 'reorderChildren')
    return withChildOrder(tree, req.parentPath, 'setOrder', req.order)
  const to = relJoin(req.newParentPath, basename(req.path))
  const moved = to === req.path ? tree : moveNodeInTree(tree, req.path, to)
  if (!moved || !req.order) return moved
  const key = req.op === 'movePage' ? 'pageOrder' : 'setOrder'
  return withChildOrder(moved, req.newParentPath, key, req.order)
}

const ahead = channel<readonly OrderRequest[]>([])

export function usePainted(source: CollectionNode | SetNode): CollectionNode | SetNode {
  const tree = useSession((s) => s.tree)
  const orders = useSyncExternalStore(ahead.subscribe, ahead.get)
  return useMemo(
    () =>
      tree && orders.length > 0
        ? (containerAt(
            orders.reduce((t, req) => orderInTree(t, req) ?? t, tree),
            source.path,
          ) ?? source)
        : source,
    [tree, source, orders],
  )
}

export function refusedDrop(landed: boolean, name: string): boolean {
  if (!landed) announceDrag('return', name)
  return landed
}

export function mutateAhead(
  req: OrderRequest,
  name: string,
  after?: Promise<boolean>,
): Promise<boolean> {
  ahead.set([...ahead.get(), req])
  const write = (): Promise<boolean> =>
    useSession
      .getState()
      .mutate(req)
      .then((outcome) => refusedDrop(outcome !== null, name))
  return (after ? after.then((ok) => ok && write()) : write()).finally(() =>
    ahead.set(ahead.get().filter((r) => r !== req)),
  )
}

type Persist = (patch: ViewPatch, opts?: { viewState?: boolean }) => Promise<Result<unknown>>

export function dropIO(
  name: string,
  persist: Persist,
): { persistView: Persist; mutate: (req: OrderRequest) => Promise<boolean> } {
  return {
    persistView: (patch, opts) =>
      persist(patch, opts).then((r) => {
        refusedDrop(r.ok, name)
        return r
      }),
    mutate: (req) => mutateAhead(req, name),
  }
}
