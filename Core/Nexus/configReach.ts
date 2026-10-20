import {
  clearHiddenBuckets,
  editHiddenBucket,
  groupsOn,
  mapTiles,
  mapViews,
  type SavedView,
  savedView,
} from '../Views/views'
import {
  answerable,
  type FilterGroup,
  type FilterRule,
  mapRules,
  NO_FILTER,
  OPERANDLESS_OPS,
  SUBSTRING_OPS,
} from '../Views/filterRules'
import {
  PROPERTY_TYPES,
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
} from '../Properties/properties'
import { editList, type Matcher, stripList } from '../Properties/pageValue'
import { unsweptLine } from '../Properties/governedSweep'
import { tileHostsOf } from '../Tiles/tileHosts'
import type { TilesChanged } from '../Tiles/tiles'
import { liveTreeOf } from './liveTree'
import { editJsonStrict, type StrictEdit, updateNexusConfig } from '../Files/atomicWrite'
import { same } from '../Files/stableJson'
import { errText } from '../Contract/result'
import { sidecarPath, tileDocPath } from '../Paths/paths'
import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { asString } from './coerce'
import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { sidecarsUnder } from '../Files/walk'
import { readWatchScope } from '../Settings/settings'
import { sidecarId } from '../Files/sidecar'
import { isPlainObject } from '../Contract/validators'
import type { CollectionNode, NexusTree, SetNode } from './tree'
import type { CascadeReport } from './cascade'
import type { ContainerKind, HeldKind } from './entities'
import { archiveReach, containerAt, contextAt, damagedFolders, spaceAt } from './treePatch'

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
type OptionReach = { def: PropertyDefinition; labels: readonly [string, string | null] }
type Gone = { propertyId: string; ids: readonly string[] }
type ConfigEdit =
  | ({ kind: 'option' } & OptionReach)
  | { kind: 'property'; propertyId: string }
  | ({ kind: 'gone' } & Gone)

type Raw = Record<string, unknown>
type ViewEdit = (view: Raw) => Raw | null
type Handler<E> = (e: E, held: unknown, view: SavedView) => unknown

/** A group the edit leaves without a rule is absent, as the filter pane writes it. */
function editRules(held: unknown, fn: (rule: Raw) => Raw | null): unknown {
  if (!isPlainObject(held) || !Array.isArray(held.rules)) return held
  const group = mapRules(held as unknown as FilterGroup, (r) => fn(r as Raw) as FilterRule | null)
  return group.rules.length > 0 ? group : undefined
}

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
    ? editOperands(rule, (xs) => editList(xs, new Map([e.labels])))
    : rule

const gone =
  (e: Gone): Matcher =>
  (el) =>
    typeof el === 'string' && e.ids.some((id) => isAtOrUnder(el, id))

const goneRule = (e: Gone, rule: Raw): Raw | null =>
  onProperty(e.propertyId, rule) ? editOperands(rule, (xs) => stripList(xs, gone(e))) : rule

const scopedOrder = (e: OptionReach, holder: unknown): unknown => {
  if (!onProperty(e.def.id, holder) || !Array.isArray(holder.order)) return holder
  const order = editList(holder.order, new Map([e.labels]))
  return order ? { ...holder, order } : holder
}

function collapsedKeys(e: OptionReach, view: SavedView, keys: unknown[]): unknown[] {
  const top = groupsOn(view, 'group', e.def.id)
  const sub = groupsOn(view, 'sub', e.def.id)
  const [from, to] = e.labels
  const rename = (k: string): string | null => {
    if (top && k === from) return to
    if (!sub || !k.endsWith(`/${from}`)) return k
    return to === null ? null : `${k.slice(0, -from.length)}${to}`
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
      editHiddenBucket({ ...view, hidden_groups: keys }, e.def.id, ...e.labels),
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
  hosts: TilesChanged[]
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

/** The containers a removal took, as locations every saved view, View Tile, and filter drops: read from the tree, or from an archived Set's sidecars on disk. */
export const goneContainers = (ids: string[]): ConfigEdit => ({
  kind: 'gone',
  propertyId: RESERVED_PROPERTY_ID.location,
  ids,
})

export function goneEdit(
  tree: NexusTree,
  kind: HeldKind,
  rel: string,
  archived: string[] = [],
): ConfigEdit | null {
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
      return node ? goneContainers([...within(node).map((n) => n.id), ...archived]) : null
    }
  }
}

const editStandalone = (rule: (r: Raw) => Raw | null, held: unknown): unknown => {
  if (!isPlainObject(held)) return held
  const rules = editRules(held.rules, rule)
  return same(rules, held.rules) ? held : { ...held, rules: rules ?? null }
}

type Container = { kind: ContainerKind; dir: string }

const reaches = (dir: string, under?: string): boolean => !under || isAtOrUnder(dir, under)

const setSidecarsUnder = async (root: string, abs: string): Promise<string[]> =>
  (await sidecarsUnder(root, await readWatchScope(root), abs)).filter(
    (file) => basename(file) === SIDECAR_FILENAME.set,
  )

/** The ids of the Sets an archived folder holds, read from their sidecars, so every saved view drops them once the folder leaves for good. */
export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
  const ids = await Promise.all(
    (await setSidecarsUnder(root, abs)).map((file) => sidecarId(dirname(file), 'set')),
  )
  return ids.flatMap((id) => id ?? [])
}

async function archivedSets(tree: NexusTree, root: string, under?: string): Promise<Container[]> {
  const archive = archiveReach(tree, under && relative(root, under))
  if (archive === null) return []
  return (await setSidecarsUnder(root, join(root, archive))).map((file) => ({
    kind: 'set',
    dir: dirname(file),
  }))
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
  // A file that doesn't parse won't read any better on a retry, so it's left as it is and holds nothing owed; only a file this pass can't read, or whose edit throws, is a skip.
  const reach: ConfigReach = { skipped: tiles.unreadable, hosts: [] }
  const written = async (path: string, mutate: (cur: Raw) => Raw | null): Promise<boolean> => {
    const outcome = await editJsonStrict(path, mutate).catch((err): StrictEdit => {
      console.error('configuration pass skipped a file:', errText(err))
      return 'unreadable'
    })
    if (outcome === 'unreadable') reach.skipped++
    return outcome === 'written'
  }
  const { view: edit, rule } = editsOf(e)
  const live = tree.collections
    .flatMap(within)
    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
    .filter(({ dir }) => reaches(dir, under))
  const sources = new Set(live.map((c) => c.id))
  const damaged = damagedFolders(tree.unreadable)
    .map((u) => ({ kind: u.kind, dir: join(root, u.path) }))
    .filter(({ dir }) => reaches(dir, under))
  for (const { kind, dir } of [...live, ...damaged]) {
    await written(sidecarPath(dir, kind), (cur) => mapViews(cur, edit))
  }
  for (const { kind, dir } of await archivedSets(tree, root, under)) {
    await written(sidecarPath(dir, kind), (cur) => {
      const id = asString(cur.id)
      if (id) sources.add(id)
      return mapViews(cur, edit)
    })
  }
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
    if (wrote && host) reach.hosts.push({ host, ids: [] })
  }
  if (!under) {
    const matrix = await updateNexusConfig(root, 'matrix', (cur) => {
      const filter = editStandalone(rule, cur.filter)
      return filter === cur.filter ? null : { ...cur, filter }
    })
    const settings = await updateNexusConfig(root, 'settings', (cur) => {
      const p = cur.personalization
      if (!isPlainObject(p)) return null
      const { openInPreview: held, ...rest } = p
      const openInPreview = editStandalone(rule, held)
      if (openInPreview === held) return null
      return {
        ...cur,
        personalization: same(openInPreview, NO_FILTER) ? rest : { ...p, openInPreview },
      }
    })
    reach.skipped += [matrix, settings].filter((r) => !r.ok).length
  }
  return reach
}
