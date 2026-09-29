import type { Result } from '@pommora/core/Contract/result'
import type { MutateOutcome } from '@pommora/core/Nexus/mutateRequest'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { resolveRowOrder } from '@pommora/core/Properties/rowOrder'
import type { SavedView, ViewPatch } from '@pommora/core/Views/views'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import type { OrderRequest } from '../../Nexus/treePatch'
import { sameIds } from '../creationOrder'
import { bucketGroupingOf, type GroupPlan, liveBucketOrder, setOrderOf } from '../Pipeline/group'
import type { SetIndex } from './setIndex'

export type SetRef = { kind: 'set'; key: string; depth: number; parentKey: string | null }
export type BucketRef = {
  kind: 'bucket'
  key: string
  depth: number
  parentKey: string | null
  value: string
}
export type BandRef = SetRef | BucketRef

type BandItem = BandRef | { kind: 'tail' }
type BandList = { nodes: readonly BandItem[]; byKey: ReadonlyMap<string, BandItem> }

export type BandDrop =
  | { kind: 'before'; beforeKey: string | null; parentKey: string | null }
  | { kind: 'into'; parentKey: string }

export interface BandScope {
  view: SavedView
  plan: GroupPlan
  schema: PropertyDefinition[]
  sets: SetIndex
  sourcePath: string
  valueAt: (key: string | null) => string | null
  shown: readonly string[]
}

interface Switched {
  propertyId: string
  prior: ViewPatch
}

export type BandEffect =
  | { kind: 'view'; patch: ViewPatch; switched?: Switched }
  | { kind: 'fs'; req: OrderRequest; after?: ViewPatch }

interface BandIO {
  persistView: (patch: ViewPatch) => Promise<Result<unknown>>
  mutate: (req: OrderRequest) => Promise<MutateOutcome | null>
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
  const ranks = ranked && nextOrder(ranked, id, before)
  const after =
    ranks && !sameIds(ranks, view.group_order ?? []) ? { group_order: ranks } : undefined
  if ((sets.parent.get(id) ?? null) !== target)
    return {
      kind: 'fs',
      req: { op: 'moveSet', path: set.path, newParentPath: targetPath, order },
      after,
    }
  if (ranked) return after ? { kind: 'view', patch: after } : null
  return {
    kind: 'fs',
    req: { op: 'reorderChildren', parentPath: targetPath, key: 'set_order', order },
  }
}

function routeBucket(dragged: BucketRef, drop: BandDrop, scope: BandScope): BandEffect | null {
  const config = bucketGroupingOf(scope.plan)
  if (drop.kind === 'into' || !config) return null
  const top = scope.plan.kind === 'property'
  const def = scope.schema.find((d) => d.id === config.property_id)
  const current = liveBucketOrder(config, def, scope.shown)
  const before = scope.valueAt(drop.beforeKey)
  const order = nextOrder(current, dragged.value, before)
  if (sameIds(order, current)) return null
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
  if (effect?.kind === 'view') {
    const saved = await io.persistView(effect.patch)
    if (saved.ok && effect.switched) io.switched?.(effect.switched)
  } else if (effect && (await io.mutate(effect.req)) && effect.after)
    await io.persistView(effect.after)
}

function bucketValue(node: BandItem | undefined): string | null {
  switch (node?.kind) {
    case 'bucket':
      return node.value
    case 'set':
    case 'tail':
    case undefined:
      return null
  }
}

export const bucketValueAt =
  (byKey: ReadonlyMap<string, BandItem>) =>
  (key: string | null): string | null =>
    key === null ? null : bucketValue(byKey.get(key))

export function dropBand(
  bands: BandList,
  dragged: BandRef,
  drop: BandDrop,
  base: Omit<BandScope, 'valueAt' | 'shown'>,
  io: BandIO,
): Promise<void> {
  const shown = bands.nodes.flatMap((n) => {
    const value = bucketValue(n)
    return value === null ? [] : [value]
  })
  return runBandEffect(
    routeBandDrop(dragged, drop, { ...base, valueAt: bucketValueAt(bands.byKey), shown }),
    io,
  )
}
