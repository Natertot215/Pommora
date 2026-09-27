import {
  clearHiddenBuckets,
  editHiddenBucket,
  type FilterGroup,
  type FilterRule,
  mapRules,
  mapTiles,
  mapViews,
  OPERANDLESS_OPS,
  ruleOperands,
  type SavedView,
  SUBSTRING_OPS,
  savedView,
} from '../Views/views'
import { cachedValues, patchCacheBlock } from '../Properties/assignment'
import { PROPERTY_TYPES, type PropertyDefinition } from '../Properties/properties'
import { editList, namesValue, type ValueEdit } from '../Properties/pageValue'
import { tileHostsOf } from '../Tiles/tilesFile'
import type { TileHostRef } from '../Tiles/tiles'
import { liveTreeOf } from './liveTree'
import { editJsonStrict, type StrictEdit } from '../Files/atomicWrite'
import { same } from '../Files/jsonMerge'
import { errText } from '../Contract/result'
import { noteSidecarWrite } from './valuesChanged'
import { nexusConfig, sidecarPath, tileDocPath } from '../Paths/paths'
import { join } from '../Paths/posix'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { isPlainObject, listOf } from '../Contract/validators'
import type { CollectionNode, NexusTree, SetNode } from './tree'

// ── Roles ──
// A field's role names the shape it holds; a field added to `savedView` fails here until it's classified.
type Role =
  | 'none'
  | 'idList'
  | 'idMap'
  | 'rules'
  | 'criteria'
  | 'group'
  | 'subGroup'
  | 'hiddenKeys'
  | 'bandKeys'

const ROLES = {
  id: 'none',
  name: 'none',
  icon: 'none',
  color: 'none',
  type: 'none',
  property_order: 'idList',
  hidden_properties: 'idList',
  column_widths: 'idMap',
  column_alignments: 'idMap',
  column_styles: 'idMap',
  collapsed_groups: 'bandKeys',
  manual_order: 'none',
  hidden_groups: 'hiddenKeys',
  hide_empty_groups: 'none',
  card_size: 'none',
  view_scale: 'none',
  card_banner: 'none',
  hide_location: 'none',
  wrap_titles: 'none',
  set_cards: 'none',
  hide_page_icons: 'none',
  hide_column_icons: 'none',
  hide_borders: 'none',
  sort: 'criteria',
  filter: 'rules',
  filter_enabled: 'none',
  group: 'group',
  format: 'none',
  group_order: 'none',
  structural_order_mode: 'none',
  location_order_mode: 'none',
  sub_group: 'subGroup',
  ungrouped_placement: 'none',
  date_separator: 'none',
} as const satisfies Record<keyof SavedView, Role>

// ── Edits ──
type OptionReach = { def: PropertyDefinition; value: string; edit: ValueEdit }
type ConfigEdit = ({ kind: 'option' } & OptionReach) | { kind: 'property'; propertyId: string }

type Raw = Record<string, unknown>
type ViewEdit = (view: Raw) => Raw | null
// A handler answers the field's next value; `undefined` removes the field.
type Handler<E> = (e: E, held: unknown, view: SavedView) => unknown

const editRules = (held: unknown, fn: (rule: Raw) => Raw | null): unknown =>
  isPlainObject(held) && Array.isArray(held.rules)
    ? mapRules(held as unknown as FilterGroup, (r) => fn(r as Raw) as FilterRule | null)
    : held

const onProperty = (id: string, holder: unknown): holder is Raw =>
  isPlainObject(holder) && holder.property_id === id

// The owner edits the stored strings; a foreign element rides through (C-2).
function overStrings(held: unknown, edit: (keys: string[]) => string[] | null): unknown {
  if (!Array.isArray(held)) return held
  const next = edit(held.filter((k): k is string => typeof k === 'string'))
  return next ? [...next, ...held.filter((k) => typeof k !== 'string')] : held
}

// A rule whose operator compares whole option values (B-1); one the edit leaves with no operand goes (B-2).
const wholeValues = (def: PropertyDefinition, op: unknown): boolean =>
  PROPERTY_TYPES[def.type].kind === 'multiSelect' || !SUBSTRING_OPS.has(String(op))

function optionRule(e: OptionReach, rule: Raw): Raw | null {
  if (!onProperty(e.def.id, rule) || !wholeValues(e.def, rule.op)) return rule
  const value =
    typeof rule.value === 'string' ? editList([rule.value], namesValue, e.value, e.edit) : null
  const values = Array.isArray(rule.values)
    ? editList(rule.values, namesValue, e.value, e.edit)
    : null
  if (!value && !values) return rule
  const next = { ...rule }
  if (value) {
    if (value.length) next.value = value[0]
    else delete next.value
  }
  if (values) {
    if (values.length) next.values = values
    else delete next.values
  }
  return OPERANDLESS_OPS.has(String(next.op)) || ruleOperands(next as FilterRule).length
    ? next
    : null
}

const scopedOrder = (e: OptionReach, holder: unknown): unknown => {
  if (!onProperty(e.def.id, holder) || !Array.isArray(holder.order)) return holder
  const order = editList(holder.order, namesValue, e.value, e.edit)
  return order ? { ...holder, order } : holder
}

// A collapsed key is the band's identity: whole at the top level, `<parent>/<bucket>` under a sub-grouping (A-4).
function collapsedKeys(e: OptionReach, view: SavedView, keys: unknown[]): unknown[] {
  const top = view.group?.kind === 'property' && view.group.property_id === e.def.id
  const sub = view.sub_group?.property_id === e.def.id
  const to = e.edit.op === 'replace' ? e.edit.to : null
  const out: unknown[] = []
  for (const k of keys) {
    let next: unknown = k
    if (typeof k === 'string' && top && k === e.value) next = to
    else if (typeof k === 'string' && sub && k.endsWith(`/${e.value}`))
      next = to === null ? null : `${k.slice(0, -e.value.length)}${to}`
    if (next !== null && !out.includes(next)) out.push(next)
  }
  return out
}

const keep: Handler<unknown> = (_e, held) => held

const RENAME: Record<Role, Handler<OptionReach>> = {
  none: keep,
  idList: keep,
  idMap: keep,
  rules: (e, held) => editRules(held, (r) => optionRule(e, r)),
  criteria: (e, held) => (Array.isArray(held) ? held.map((c) => scopedOrder(e, c)) : held),
  group: scopedOrder,
  subGroup: scopedOrder,
  hiddenKeys: (e, held, view) =>
    overStrings(held, (keys) =>
      editHiddenBucket(
        { ...view, hidden_groups: keys },
        e.def.id,
        e.value,
        e.edit.op === 'replace' ? e.edit.to : null,
      ),
    ),
  bandKeys: (e, held, view) => (Array.isArray(held) ? collapsedKeys(e, view, held) : held),
}

const CLEAR: Record<Role, Handler<string>> = {
  none: keep,
  idList: (id, held) => (Array.isArray(held) ? held.filter((x) => x !== id) : held),
  idMap: (id, held) =>
    isPlainObject(held) && id in held
      ? Object.fromEntries(Object.entries(held).filter(([k]) => k !== id))
      : held,
  rules: (id, held) => editRules(held, (r) => (onProperty(id, r) ? null : r)),
  criteria: (id, held) => (Array.isArray(held) ? held.filter((c) => !onProperty(id, c)) : held),
  group: (id, held) => (onProperty(id, held) ? { kind: 'structural' } : held),
  subGroup: (id, held) => (onProperty(id, held) ? undefined : held),
  hiddenKeys: (id, held, view) =>
    overStrings(held, (keys) => clearHiddenBuckets({ ...view, hidden_groups: keys }, id)),
  bandKeys: (id, held, view) =>
    view.group?.kind === 'property' && view.group.property_id === id
      ? []
      : view.sub_group?.property_id === id && Array.isArray(held)
        ? held.filter((k) => typeof k !== 'string' || !k.includes('/'))
        : held,
}

function viewEdit<E>(table: Record<Role, Handler<E>>, e: E): ViewEdit {
  return (raw) => {
    const view = savedView.safeParse(raw).data
    if (!view) return null
    const next: Raw = { ...raw }
    for (const [field, role] of Object.entries(ROLES) as [keyof SavedView, Role][]) {
      if (role === 'none' || !(field in raw)) continue
      const held = table[role](e, raw[field], view)
      if (held === undefined) delete next[field]
      else next[field] = held
    }
    return same(raw, next) ? null : next
  }
}

export const propertyClear = (propertyId: string): ViewEdit => viewEdit(CLEAR, propertyId)
const optionReach = (e: OptionReach): ViewEdit => viewEdit(RENAME, e)

// ── Reach ──
export interface ConfigReach {
  skipped: number
  hosts: TileHostRef[]
}

interface Scope {
  /** A Collection folder (absolute): its own sidecar, already written by the caller, is left; its Sets and every tile sourcing them are edited, and the Matrix is left (B-6). */
  under?: string
}

const viewEditOf = (e: ConfigEdit): ViewEdit =>
  e.kind === 'option' ? optionReach(e) : propertyClear(e.propertyId)

/** The Collection sidecar's `property_cache` values follow an option edit through the one cache writer. */
function cacheEdit(e: ConfigEdit, cur: Raw): Raw | null {
  if (e.kind !== 'option') return null
  const cached = cachedValues(cur, e.def.id)
  if (!cached) return null
  const values: Record<string, unknown> = {}
  let touched = false
  for (const [id, held] of Object.entries(cached)) {
    const edited = editList(listOf(held), namesValue, e.value, e.edit)
    if (!edited) values[id] = held
    else {
      touched = true
      if (edited.length) values[id] = edited
    }
  }
  return touched
    ? patchCacheBlock(cur, e.def.id, Object.keys(values).length ? { values } : undefined)
    : null
}

type Container = { kind: 'collection' | 'set'; id: string; dir: string }

function containersOf(tree: NexusTree, root: string, under?: string): Container[] {
  const out: Container[] = []
  const walk = (node: CollectionNode | SetNode): void => {
    const dir = join(root, node.path)
    if (!under || dir === under || dir.startsWith(`${under}/`))
      out.push({ kind: node.kind, id: node.id, dir })
    for (const s of node.sets ?? []) walk(s)
  }
  for (const c of tree.collections) walk(c)
  return out
}

export async function reachConfig(
  root: string,
  e: ConfigEdit,
  scope: Scope = {},
): Promise<ConfigReach> {
  let tree: NexusTree
  try {
    tree = await liveTreeOf(root)
  } catch {
    return { skipped: 1, hosts: [] }
  }
  const tiles = tileHostsOf(root, tree)
  const reach: ConfigReach = { skipped: tiles.unreadable, hosts: [] }
  // A file that can't be edited or written is one skip, as a guarded page sweep counts it; the pass goes on.
  const written = async (path: string, mutate: (cur: Raw) => Raw | null): Promise<boolean> => {
    const outcome = await editJsonStrict(path, mutate).catch((e): StrictEdit => {
      console.error('configuration pass skipped a file:', errText(e))
      return 'unreadable'
    })
    if (outcome === 'unreadable' || outcome === 'corrupt') reach.skipped++
    return outcome === 'written'
  }
  const edit = viewEditOf(e)
  const containers = containersOf(tree, root, scope.under)
  for (const { kind, dir } of containers) {
    if (dir === scope.under) continue
    const wrote = await written(sidecarPath(dir, kind), (cur) => {
      const views = mapViews(cur, edit)
      const cache = kind === 'collection' ? cacheEdit(e, views ?? cur) : null
      return cache ?? views
    })
    if (wrote) noteSidecarWrite(dir)
  }
  const sources = new Set(containers.map((c) => c.id))
  const inScope = (tile: Raw): boolean =>
    !scope.under ||
    (Array.isArray(tile.views) &&
      tile.views.some((v) => isPlainObject(v) && sources.has(String(v.source_id))))
  for (const { host, dir } of tiles.hosts) {
    const wrote = await written(tileDocPath(dir), (cur) =>
      mapTiles(cur, (tile) => (inScope(tile) ? mapViews(tile, edit) : null)),
    )
    if (wrote) reach.hosts.push(host)
  }
  if (!scope.under)
    await written(nexusConfig(root, NEXUS_CONFIG_FILES.matrix), (cur) => {
      if (!isPlainObject(cur.filter)) return null
      const rules = editRules(cur.filter.rules, (r) =>
        e.kind === 'option' ? optionRule(e, r) : onProperty(e.propertyId, r) ? null : r,
      )
      return same(rules, cur.filter.rules) ? null : { ...cur, filter: { ...cur.filter, rules } }
    })
  return reach
}
