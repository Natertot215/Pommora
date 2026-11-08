import type { Result } from '../../Contract/result'
import type { SavedView, ViewPatch } from '../views'
import { nextOrder, resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
import type { OrderRequest } from '../../Nexus/mutateRequest'
import { sameItems } from '@pommora/uix/Utilities/same'
import { bucketGroupingOf, type GroupPlan, liveBucketOrder, setOrderOf } from '../Pipeline/group'
import type { SetIndex } from './setIndex'
import {
  type BandDrop,
  type BandModel,
  type BandRef,
  type BucketRef,
  bucketValueAt,
} from './bandModel'

export interface BandScope {
  view: SavedView
  plan: GroupPlan
  sets: SetIndex
  sourcePath: string
  bands: BandModel
}

interface Switched {
  propertyId: string
  prior: ViewPatch
}

type BandEffect =
  | { kind: 'view'; patch: ViewPatch; switched?: Switched }
  | { kind: 'fs'; req: OrderRequest; after?: ViewPatch; prior?: ViewPatch }

interface BandIO {
  persistView: (patch: ViewPatch) => Promise<Result<unknown>>
  mutate: (req: OrderRequest) => Promise<boolean>
  persistAfter: (patch: ViewPatch, landed: Promise<boolean>) => void
  switched?: (s: Switched) => void
}

export function routeBandDrop(
  dragged: BandRef,
  drop: BandDrop,
  scope: BandScope,
): BandEffect | null {
  switch (dragged.kind) {
    case 'set':
      return routeSet(dragged.key, drop, scope)
    case 'bucket':
      return routeBucket(dragged, drop, scope)
  }
}

const showsAlike = (parents: readonly string[][], a: string[], b: string[] | undefined): boolean =>
  parents.every((kids) =>
    sameItems(
      resolveRowOrder(kids, (s) => s, a),
      resolveRowOrder(kids, (s) => s, b),
    ),
  )

function routeSet(id: string, drop: BandDrop, scope: BandScope): BandEffect | null {
  const { sets, view } = scope
  const set = sets.node.get(id)
  const target = drop.parentKey
  const targetPath = target === null ? scope.sourcePath : sets.node.get(target)?.path
  if (!set || targetPath === undefined) return null
  const children = sets.children.get(target) ?? []
  const into = drop.kind === 'into'
  const order = nextOrder(
    children,
    id,
    into ? (children.find((s) => s !== id) ?? null) : drop.beforeKey,
  )
  const custom = setOrderOf(scope.plan, view) === 'custom'
  const ranked = custom ? resolveRowOrder(sets.preorder, (s) => s, view.group_order) : null
  const before = into
    ? (ranked?.find((s) => s !== id && sets.parent.get(s) === target) ?? null)
    : drop.beforeKey
  const from = sets.parent.get(id) ?? null
  const landed =
    from === target ? [children] : [(sets.children.get(from) ?? []).filter((s) => s !== id), order]
  const ranks = ranked && nextOrder(ranked, id, before)
  const after =
    ranks && !showsAlike(landed, ranks, view.group_order) ? { group_order: ranks } : undefined
  if (from !== target)
    return {
      kind: 'fs',
      req: { op: 'moveSet', path: set.path, newParentPath: targetPath, order },
      after,
      prior: after && { group_order: ranked! },
    }
  if (ranked) return after ? { kind: 'view', patch: after } : null
  return {
    kind: 'fs',
    req: { op: 'reorderChildren', parentPath: targetPath, key: 'set_order', order },
  }
}

function routeBucket(dragged: BucketRef, drop: BandDrop, scope: BandScope): BandEffect | null {
  const grouping = bucketGroupingOf(scope.plan)
  if (drop.kind === 'into' || !grouping) return null
  const { config, column } = grouping
  const top = scope.plan.kind === 'property'
  const shown = scope.bands.nodes.flatMap((n) => (n.kind === 'bucket' ? [n.value] : []))
  const current = liveBucketOrder(config, column.def, shown)
  const before = bucketValueAt(scope.bands.byKey)(drop.beforeKey)
  const order = nextOrder(current, dragged.value, before)
  if (sameItems(order, current)) return null
  const next = { ...config, order_mode: 'manual' as const, order }
  return {
    kind: 'view',
    patch: top ? { group: { ...next, kind: 'property' } } : { sub_group: next },
    switched:
      config.order_mode === 'manual'
        ? undefined
        : {
            propertyId: config.property_id,
            prior: top ? { group: scope.view.group } : { sub_group: scope.view.sub_group },
          },
  }
}

export async function runBandEffect(effect: BandEffect | null, io: BandIO): Promise<void> {
  switch (effect?.kind) {
    case undefined:
      return
    case 'view': {
      const saved = await io.persistView(effect.patch)
      if (saved.ok && effect.switched) io.switched?.(effect.switched)
      return
    }
    case 'fs': {
      const landed = io.mutate(effect.req)
      if (effect.after) io.persistAfter(effect.after, landed)
      await landed
    }
  }
}

export interface BandRouting {
  moves: (dragged: BandRef) => (drop: BandDrop) => boolean
  drop: (dragged: BandRef, drop: BandDrop) => boolean
}

export function bandRouting(
  scope: BandScope,
  io: (dragged: BandRef, prior?: ViewPatch) => BandIO,
): BandRouting {
  return {
    moves: (dragged) => (drop) => routeBandDrop(dragged, drop, scope) !== null,
    drop: (dragged, drop) => {
      const effect = routeBandDrop(dragged, drop, scope)
      void runBandEffect(effect, io(dragged, effect?.kind === 'fs' ? effect.prior : undefined))
      return effect !== null
    },
  }
}
