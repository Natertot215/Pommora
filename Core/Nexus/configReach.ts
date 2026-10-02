import {
  answerable,
  clearHiddenBuckets,
  editHiddenBucket,
  type FilterGroup,
  type FilterRule,
  groupsOn,
  mapRules,
  mapTiles,
  mapViews,
  OPERANDLESS_OPS,
  type SavedView,
  SUBSTRING_OPS,
  savedView,
} from '../Views/views'
import { editCacheBlocks } from '../Properties/propertyCache'
import {
  PROPERTY_TYPES,
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
} from '../Properties/properties'
import {
  editList,
  type Matcher,
  namesValue,
  stripList,
  type ValueEdit,
} from '../Properties/pageValue'
import { unsweptLine } from '../Properties/governedSweep'
import { tileHostsOf } from '../Tiles/tilesFile'
import type { TileHostRef } from '../Tiles/tiles'
import { liveTreeOf } from './liveTree'
import { editJsonStrict, type StrictEdit, updateNexusConfig } from '../Files/atomicWrite'
import { same } from '../Files/stableJson'
import { errText } from '../Contract/result'
import { sidecarPath, tileDocPath } from '../Paths/paths'
import { join } from '../Paths/posix'
import { isPlainObject, listOf } from '../Contract/validators'
import { type CollectionNode, damagedFolders, type NexusTree, type SetNode } from './tree'
import type { CascadeReport } from './cascade'
import type { HeldKind } from './entities'
import { containerAt, contextAt, spaceAt } from './treePatch'

// ── Roles ──
type Role =
  | 'none'
  | 'idList'
  | 'idMap'
  | 'setIds'
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
  group_order: 'setIds',
  structural_order_mode: 'none',
  location_order_mode: 'none',
  sub_group: 'subGroup',
  ungrouped_placement: 'none',
  date_separator: 'none',
} as const satisfies Record<keyof SavedView, Role>

// ── Edits ──
type OptionReach = { def: PropertyDefinition; value: string; edit: ValueEdit }
type Gone = { propertyId: string; ids: readonly string[] }
type ConfigEdit =
  | ({ kind: 'option' } & OptionReach)
  | { kind: 'property'; propertyId: string }
  | ({ kind: 'gone' } & Gone)

type Raw = Record<string, unknown>
type ViewEdit = (view: Raw) => Raw | null
type Handler<E> = (e: E, held: unknown, view: SavedView) => unknown

const editRules = (held: unknown, fn: (rule: Raw) => Raw | null): unknown =>
  isPlainObject(held) && Array.isArray(held.rules)
    ? mapRules(held as unknown as FilterGroup, (r) => fn(r as Raw) as FilterRule | null)
    : held

const onProperty = (id: string, holder: unknown): holder is Raw =>
  isPlainObject(holder) && holder.property_id === id

const clearRule = (id: string, rule: Raw): Raw | null => (onProperty(id, rule) ? null : rule)

function overStrings(held: unknown, edit: (keys: string[]) => string[] | null): unknown {
  if (!Array.isArray(held)) return held
  const next = edit(held.filter((k): k is string => typeof k === 'string'))
  return next ? [...next, ...held.filter((k) => typeof k !== 'string')] : held
}

const wholeValues = (def: PropertyDefinition, op: unknown): boolean =>
  PROPERTY_TYPES[def.type].kind === 'multiSelect' || !SUBSTRING_OPS.has(String(op))

function editOperands(rule: Raw, edit: (xs: readonly unknown[]) => unknown[] | null): Raw | null {
  const value = typeof rule.value === 'string' ? edit([rule.value]) : null
  const values = Array.isArray(rule.values) ? edit(rule.values) : null
  if (!value && !values) return rule
  const operandless = OPERANDLESS_OPS.has(String(rule.op))
  if (values && !values.length && !operandless) return null
  const next = { ...rule }
  if (value) {
    if (value.length) next.value = value[0]
    else delete next.value
  }
  if (values) {
    if (values.length) next.values = values
    else delete next.values
  }
  return answerable(next as FilterRule) ? next : null
}

const optionRule = (e: OptionReach, rule: Raw): Raw | null =>
  onProperty(e.def.id, rule) && wholeValues(e.def, rule.op)
    ? editOperands(rule, (xs) => editList(xs, namesValue, e.value, e.edit))
    : rule

const gone =
  (e: Gone): Matcher =>
  (el) =>
    typeof el === 'string' && e.ids.some((id) => el === id || el.startsWith(`${id}/`))

const goneRule = (e: Gone, rule: Raw): Raw | null =>
  onProperty(e.propertyId, rule) ? editOperands(rule, (xs) => stripList(xs, gone(e))) : rule

const scopedOrder = (e: OptionReach, holder: unknown): unknown => {
  if (!onProperty(e.def.id, holder) || !Array.isArray(holder.order)) return holder
  const order = editList(holder.order, namesValue, e.value, e.edit)
  return order ? { ...holder, order } : holder
}

function collapsedKeys(e: OptionReach, view: SavedView, keys: unknown[]): unknown[] {
  const top = groupsOn(view, 'group', e.def.id)
  const sub = groupsOn(view, 'sub', e.def.id)
  const to = e.edit.op === 'replace' ? e.edit.to : null
  const rename = (k: string): string | null => {
    if (top && k === e.value) return to
    if (!sub || !k.endsWith(`/${e.value}`)) return k
    return to === null ? null : `${k.slice(0, -e.value.length)}${to}`
  }
  const renamed = keys.map((k) => (typeof k === 'string' ? rename(k) : k))
  return [...new Set(renamed)].filter((k) => k !== null)
}

const keep: Handler<unknown> = (_e, held) => held

const RENAME: Record<Role, Handler<OptionReach>> = {
  none: keep,
  idList: keep,
  idMap: keep,
  setIds: keep,
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
  setIds: keep,
  rules: (id, held) => editRules(held, (r) => clearRule(id, r)),
  criteria: (id, held) => (Array.isArray(held) ? held.filter((c) => !onProperty(id, c)) : held),
  group: (id, held) => (onProperty(id, held) ? { kind: 'structural' } : held),
  subGroup: (id, held) => (onProperty(id, held) ? undefined : held),
  hiddenKeys: (id, held, view) =>
    overStrings(held, (keys) => clearHiddenBuckets({ ...view, hidden_groups: keys }, id)),
  bandKeys: (id, held, view) =>
    groupsOn(view, 'group', id)
      ? []
      : groupsOn(view, 'sub', id) && Array.isArray(held)
        ? held.filter((k) => typeof k !== 'string' || !k.includes('/'))
        : held,
}

const stripGone: Handler<Gone> = (e, held) =>
  Array.isArray(held) ? (stripList(held, gone(e)) ?? held) : held

const GONE: Record<Role, Handler<Gone>> = {
  none: keep,
  idList: keep,
  idMap: keep,
  setIds: stripGone,
  rules: (e, held) => editRules(held, (r) => goneRule(e, r)),
  criteria: keep,
  group: keep,
  subGroup: keep,
  hiddenKeys: stripGone,
  bandKeys: stripGone,
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

function editsOf(e: ConfigEdit): { view: ViewEdit; rule: (rule: Raw) => Raw | null } {
  switch (e.kind) {
    case 'option':
      return { view: viewEdit(RENAME, e), rule: (r) => optionRule(e, r) }
    case 'property':
      return { view: propertyClear(e.propertyId), rule: (r) => clearRule(e.propertyId, r) }
    case 'gone':
      return { view: viewEdit(GONE, e), rule: (r) => goneRule(e, r) }
  }
}

// ── Reach ──
export interface ConfigReach {
  skipped: number
  hosts: TileHostRef[]
}

export const NO_REACH: ConfigReach = { skipped: 0, hosts: [] }

export const reachReport = ({ hosts, skipped }: ConfigReach): CascadeReport => ({
  pages: [],
  hosts,
  ...(skipped ? { warning: unsweptLine(skipped) } : {}),
})

const within = (node: CollectionNode | SetNode): (CollectionNode | SetNode)[] => [
  node,
  ...(node.sets ?? []).flatMap(within),
]

export function goneEdit(tree: NexusTree, kind: HeldKind, rel: string): ConfigEdit | null {
  switch (kind) {
    case 'page':
      return null
    case 'context': {
      const group = contextAt(tree, rel)
      return group ? { kind: 'property', propertyId: group.def.id } : null
    }
    case 'space': {
      const space = spaceAt(tree, rel)
      return space ? { kind: 'gone', propertyId: space.contextId, ids: [space.id] } : null
    }
    case 'collection':
    case 'set': {
      const node = containerAt(tree, rel)
      return node
        ? {
            kind: 'gone',
            propertyId: RESERVED_PROPERTY_ID.location,
            ids: within(node).map((n) => n.id),
          }
        : null
    }
  }
}

const cacheEdit = (e: OptionReach, cur: Raw): Raw | null =>
  editCacheBlocks(cur, [e.def.id], (cached) => {
    const values = { ...cached }
    let touched = false
    for (const [id, held] of Object.entries(cached)) {
      const edited = editList(listOf(held), namesValue, e.value, e.edit)
      if (!edited) continue
      touched = true
      if (edited.length) values[id] = edited
      else delete values[id]
    }
    return touched ? values : null
  })

type Container = { kind: 'collection' | 'set'; id: string; dir: string }

const reaches =
  (under?: string) =>
  (dir: string): boolean =>
    !under || dir === under || dir.startsWith(`${under}/`)

function containersOf(tree: NexusTree, root: string, under?: string): Container[] {
  return tree.collections
    .flatMap(within)
    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
    .filter(({ dir }) => reaches(under)(dir))
}

export async function reachConfig(
  root: string,
  e: ConfigEdit,
  under?: string,
): Promise<ConfigReach> {
  let tree: NexusTree
  try {
    tree = await liveTreeOf(root)
  } catch {
    return { skipped: 1, hosts: [] }
  }
  const tiles = tileHostsOf(root, tree)
  // A Collection or Set whose sidecar doesn't parse is out of the tree and this pass can't reach it, so each counts as a skip and the journal keeps the change owed until it reads.
  const damaged = damagedFolders(tree.unreadable).filter((u) => reaches(under)(join(root, u.path)))
  const reach: ConfigReach = { skipped: tiles.unreadable + damaged.length, hosts: [] }
  const written = async (path: string, mutate: (cur: Raw) => Raw | null): Promise<boolean> => {
    const outcome = await editJsonStrict(path, mutate).catch((err): StrictEdit => {
      console.error('configuration pass skipped a file:', errText(err))
      return 'unreadable'
    })
    if (outcome === 'unreadable' || outcome === 'corrupt') reach.skipped++
    return outcome === 'written'
  }
  const { view: edit, rule } = editsOf(e)
  const containers = containersOf(tree, root, under)
  for (const { kind, dir } of containers) {
    await written(sidecarPath(dir, kind), (cur) => {
      const views = mapViews(cur, edit)
      const cache = kind === 'collection' && e.kind === 'option' ? cacheEdit(e, views ?? cur) : null
      return cache ?? views
    })
  }
  const sources = new Set(containers.map((c) => c.id))
  const inScope = (entry: unknown): boolean => {
    const source = isPlainObject(entry) ? String(entry.source_id) : ''
    return (!under || sources.has(source)) && !(e.kind === 'gone' && e.ids.includes(source))
  }
  for (const { host, dir } of tiles.hosts) {
    const wrote = await written(tileDocPath(dir), (cur) =>
      mapTiles(cur, (tile) =>
        mapViews(tile, (view, i) => (inScope((tile.views as unknown[])[i]) ? edit(view) : null)),
      ),
    )
    if (wrote && host) reach.hosts.push(host)
  }
  if (!under) {
    const edited = await updateNexusConfig(root, 'matrix', (cur) => {
      if (!isPlainObject(cur.filter)) return null
      const rules = editRules(cur.filter.rules, rule)
      return same(rules, cur.filter.rules) ? null : { ...cur, filter: { ...cur.filter, rules } }
    })
    if (!edited.ok) reach.skipped++
  }
  return reach
}
