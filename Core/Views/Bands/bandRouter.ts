import type { Result } from '../../Contract/result'
import type { PropertyDefinition } from '../../Properties/properties'
import { resolveRowOrder } from '../../Properties/rowOrder'
import type { SavedView, ViewPatch } from '../views'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import type { OrderRequest } from '../../Nexus/mutateRequest'
import { sameItems } from '@pommora/uix/Utilities/same'
import { bucketGroupingOf, type GroupPlan, liveBucketOrder, setOrderOf } from '../Pipeline/group'
import type { SetIndex } from '../Pipeline/setIndex'

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

type BandEffect =
  | { kind: 'view'; patch: ViewPatch; switched?: Switched }
  | { kind: 'fs'; req: OrderRequest; after?: ViewPatch }

interface BandIO {
  persistView: (patch: ViewPatch) => Promise<Result<unknown>>
  mutate: (req: OrderRequest) => Promise<boolean>
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
    case 'fs':
      if ((await io.mutate(effect.req)) && effect.after) await io.persistView(effect.after)
  }
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

type BandBase = Omit<BandScope, 'valueAt' | 'shown'>

const bandScopeOf = (bands: BandList, base: BandBase): BandScope => ({
  ...base,
  valueAt: bucketValueAt(bands.byKey),
  shown: bands.nodes.flatMap((n) => {
    const value = bucketValue(n)
    return value === null ? [] : [value]
  }),
})

export interface BandRouting {
  moves: (dragged: BandRef) => (drop: BandDrop) => boolean
  drop: (dragged: BandRef, drop: BandDrop) => boolean
}

export function bandRouting(
  bands: BandList,
  base: BandBase,
  io: (dragged: BandRef) => BandIO,
): BandRouting {
  return {
    moves: (dragged) => {
      const scope = bandScopeOf(bands, base)
      return (drop) => routeBandDrop(dragged, drop, scope) !== null
    },
    drop: (dragged, drop) => {
      const effect = routeBandDrop(dragged, drop, bandScopeOf(bands, base))
      void runBandEffect(effect, io(dragged))
      return effect !== null
    },
  }
}
