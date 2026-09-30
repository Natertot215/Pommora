import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { PropertyDefinition } from '../../Properties/properties'
import { isEmptyBand, type ResolvedGroup } from '../viewRow'
import { granularityOf, type SavedView, type SubGroupConfig, viewOption } from '../views'
import type { StepPart } from '@pommora/uix/Interactions/keyboard'
import { type Geometry, INTO_EDGE, rank, walksTo } from '@pommora/uix/Interactions/reorderModel'
import { asRenderableIcon } from '@pommora/uix/Symbols'
import { findOption } from '../../Properties/Cells/cellResolve'
import type { OptionChipData } from '../../Properties/Cells/OptionChip'
import { formatBucketLabel } from '../../Properties/formatValue'
import {
  type BandDrop,
  type BandRef,
  type BucketRef,
  bucketValueAt,
  type SetRef,
} from './bandRouter'
import type { SetIndex } from '../Pipeline/setIndex'

// ── Nodes ───────────────────────────────────────────────────────────────────

type BucketFace =
  | { kind: 'option'; type: string; option: OptionChipData; def: PropertyDefinition | undefined }
  | { kind: 'date'; icon: string | undefined }

export type SetBand = SetRef & { set: SetNode; opens: boolean; empty: boolean }
export type BucketBand = BucketRef & { label: string; face: BucketFace; empty: boolean }
type TailBand = { kind: 'tail'; key: string; depth: number; parentKey: string | null }
export type BandNode = SetBand | BucketBand | TailBand

export interface BandModel {
  nodes: readonly BandNode[]
  byKey: ReadonlyMap<string, BandNode>
}

interface HeadContext {
  sets: SetIndex
  opensTop: boolean
  bucket: (value: string) => Pick<BucketBand, 'label' | 'face'>
}

export function dateLabeller(
  view: SavedView,
  grouping: SubGroupConfig,
  format: ColumnStyle['date_format'],
): (key: string) => string {
  const granularity = granularityOf(grouping)
  const separator = viewOption(view, 'date_separator')
  return (key) => formatBucketLabel(key, granularity, format, separator)
}

export function headContextOf(
  source: CollectionNode | SetNode,
  sets: SetIndex,
  grouping: SubGroupConfig | undefined,
  schema: PropertyDefinition[],
  view: SavedView,
  styleOf: (columnId: string) => ColumnStyle,
): HeadContext {
  const def = grouping && schema.find((d) => d.id === grouping.property_id)
  const date =
    grouping &&
    def?.type === 'dateTime' &&
    dateLabeller(view, grouping, styleOf(grouping.property_id).date_format)
  const icon = asRenderableIcon(def?.icon)
  return {
    sets,
    opensTop: source.kind === 'collection',
    bucket: (value) =>
      date
        ? { label: date(value), face: { kind: 'date', icon } }
        : {
            label: value,
            face: {
              kind: 'option',
              type: def?.type ?? '',
              option: findOption(def, value) ?? { value },
              def,
            },
          },
  }
}

function bandNodeOf(
  group: ResolvedGroup,
  depth: number,
  parentKey: string | null,
  heads: HeadContext,
): BandNode | null {
  const { key } = group
  switch (group.kind) {
    case 'tail':
      return { kind: 'tail', key, depth, parentKey }
    case 'set': {
      const set = heads.sets.node.get(key)
      if (!set) return null
      const opens = heads.opensTop && parentKey === null
      return { kind: 'set', key, depth, parentKey, set, opens, empty: isEmptyBand(group) }
    }
    case 'bucket':
      return {
        kind: 'bucket',
        key,
        depth,
        parentKey,
        value: group.value,
        empty: isEmptyBand(group),
        ...heads.bucket(group.value),
      }
  }
}

export function bandModelOf(groups: readonly ResolvedGroup[], heads: HeadContext): BandModel {
  const nodes: BandNode[] = []
  const walk = (gs: readonly ResolvedGroup[], depth: number, parentKey: string | null): void => {
    for (const g of gs) {
      const node = bandNodeOf(g, depth, parentKey, heads)
      if (node) nodes.push(node)
      if (g.children) walk(g.children, depth + 1, g.key)
    }
  }
  walk(groups, 0, null)
  return { nodes, byKey: new Map(nodes.map((n) => [n.key, n])) }
}

export function nodeLabel(node: BandNode | undefined): string {
  switch (node?.kind) {
    case 'set':
      return node.set.title
    case 'bucket':
      return node.label
    case 'tail':
    case undefined:
      return ''
  }
}

export function draggable(node: BandNode): node is SetBand | BucketBand {
  switch (node.kind) {
    case 'set':
      return true
    case 'bucket':
      return node.face.kind !== 'date'
    case 'tail':
      return false
  }
}

export const memberDepth = (kind: BandNode['kind'], depth: number): number =>
  kind === 'tail' ? depth : depth + 1

export const bandBox = (key: string): string => `${key}#box`

export function springsInto(
  model: BandModel,
  dragged: string,
  target: BandNode,
  nests: boolean,
): boolean {
  const d = model.byKey.get(dragged)
  if (target.kind !== 'set' || d === undefined) return false
  switch (d.kind) {
    case 'set':
      return nests && !walksTo(target.key, d.key, (k) => model.byKey.get(k)?.parentKey)
    case 'bucket':
      return !target.empty
    case 'tail':
      return false
  }
}

export function shownHeads(nodes: readonly BandNode[], collapsed: ReadonlySet<string>): BandRef[] {
  const out: BandRef[] = []
  let hidden = Number.POSITIVE_INFINITY
  for (const node of nodes) {
    if (node.depth > hidden) continue
    hidden = collapsed.has(node.key) ? node.depth : Number.POSITIVE_INFINITY
    if (node.kind !== 'tail') out.push(node)
  }
  return out
}

// ── The slot model ──────────────────────────────────────────────────────────

export type BandSlot = {
  drop: BandDrop
  top: number
  depth: number
  step: { part: StepPart; id: string }
  moves?: boolean
}

type Zone = {
  top: number
  edge: number
  mid: number
  inner: number
  end: number
  nests: boolean
  before: BandSlot | null
  into: BandSlot | null
  after: BandSlot | null
}

export type BandSnap = {
  dragged: BandRef
  tops: number[]
  zones: Zone[]
  from: number
  to: number
  tail: BandSlot | null
  bottom: number
  moves: (drop: BandDrop) => boolean
}

export function bandSnap(
  g: Geometry,
  heads: readonly BandRef[],
  draggedKey: string,
  nests: boolean,
  moves: (dragged: BandRef) => (drop: BandDrop) => boolean,
): BandSnap | null {
  const rowOf = new Map(g.rows.map((r) => [r.id, r]))
  const dragged = heads.find((h) => h.key === draggedKey)
  if (!dragged) return null
  const extent = new Map<string, number>()
  for (let i = heads.length - 1; i >= 0; i--) {
    const h = heads[i]
    const r = rowOf.get(h.key)
    if (!r) continue
    const e = Math.max(r.bottom, g.groups.get(bandBox(h.key))?.bottom ?? 0, extent.get(h.key) ?? 0)
    extent.set(h.key, e)
    if (h.parentKey !== null) extent.set(h.parentKey, Math.max(extent.get(h.parentKey) ?? 0, e))
  }
  const peers = heads.filter((h) => h.kind === dragged.kind && rowOf.has(h.key))
  const from = peers.indexOf(dragged)
  if (from < 0) return null
  let to = from + 1
  while (to < peers.length && peers[to].depth > dragged.depth) to++
  const next = new Map<string | null, string>()
  const nextSib = new Map<string, string | null>()
  const last = new Map<string | null, string>()
  let ownNext: string | null = null
  for (let i = peers.length - 1; i >= 0; i--) {
    const p = peers[i]
    if (i === from) ownNext = next.get(p.parentKey) ?? null
    if (i >= from && i < to) continue
    nextSib.set(p.key, next.get(p.parentKey) ?? null)
    next.set(p.parentKey, p.key)
    if (!last.has(p.parentKey)) last.set(p.parentKey, p.key)
  }
  const byKey = new Map(peers.map((p) => [p.key, p]))
  const valueAt = bucketValueAt(byKey)
  const slots = new Map<string, BandSlot | null>()
  const slot = (drop: BandDrop, top: () => number, depth: number): BandSlot | null => {
    const key =
      drop.kind === 'into' ? `into:${drop.parentKey}` : `${drop.parentKey}>${drop.beforeKey}`
    if (!slots.has(key)) {
      const still =
        drop.kind === 'before' &&
        (drop.beforeKey === dragged.key ||
          (drop.parentKey === dragged.parentKey && drop.beforeKey === ownNext) ||
          (dragged.kind === 'bucket' && valueAt(drop.beforeKey) === dragged.value))
      const step =
        drop.kind === 'into'
          ? { part: 'into' as const, id: drop.parentKey }
          : drop.beforeKey === null
            ? { part: 'after' as const, id: last.get(drop.parentKey) ?? '' }
            : { part: 'before' as const, id: drop.beforeKey }
      slots.set(key, still ? null : { drop, top: top(), depth, step })
    }
    return slots.get(key) ?? null
  }
  const before = (p: BandRef): BandSlot | null =>
    slot(
      { kind: 'before', beforeKey: p.key, parentKey: p.parentKey },
      () => rowOf.get(p.key)?.top ?? 0,
      p.depth,
    )
  const endOf = (parentKey: string | null, depth: number): BandSlot | null => {
    const tail = last.get(parentKey)
    return tail === undefined
      ? null
      : slot({ kind: 'before', beforeKey: null, parentKey }, () => extent.get(tail) ?? 0, depth)
  }
  const zones = peers.map((p, i): Zone => {
    const r = rowOf.get(p.key)!
    const h = r.bottom - r.top
    const child = peers[i + 1]?.parentKey === p.key ? peers[i + 1] : undefined
    const own = Math.max(
      r.bottom,
      (child ? g.groups.get(bandBox(child.key))?.top : extent.get(p.key)) ?? 0,
    )
    const nestable = nests && p.kind === 'set' && dragged.kind === 'set'
    const sib = nextSib.get(p.key)
    return {
      top: r.top,
      edge: r.top + h * INTO_EDGE,
      mid: r.mid,
      inner: own - h * INTO_EDGE,
      end: child ? (rowOf.get(child.key)?.top ?? own) : own,
      nests: nestable,
      before: before(p),
      into:
        !nestable || child === dragged
          ? null
          : child
            ? before(child)
            : slot({ kind: 'into', parentKey: p.key }, () => own, p.depth + 1),
      after: sib ? before(byKey.get(sib)!) : endOf(p.parentKey, p.depth),
    }
  })
  return {
    dragged,
    tops: zones.map((z) => z.top),
    zones,
    from,
    to,
    tail: dragged.kind === 'set' ? endOf(null, 0) : null,
    bottom: g.bottom,
    moves: moves(dragged),
  }
}

export function bandSlot(s: BandSnap, y: number): BandSlot | null {
  const slot = slotAt(s, y)
  if (!slot) return null
  slot.moves ??= s.moves(slot.drop)
  return slot.moves ? slot : null
}

function slotAt(s: BandSnap, y: number): BandSlot | null {
  if (s.tail && y >= s.bottom) return s.tail
  const k = rank(s.tops, y) - 1
  if (k < 0) return s.zones[0]?.before ?? null
  if (k >= s.from && k < s.to) return null
  const z = s.zones[k]
  if (y < z.edge) return z.before
  if (y < z.end) return z.nests ? (y < z.inner ? z.into : z.after) : y < z.mid ? z.before : z.after
  const n = s.zones[k + 1]
  if (!n) return s.tail ?? z.after
  return y < (z.end + n.top) / 2 ? z.after : n.before
}
