import { bandKey, mapTiles, mapViews, type SavedView, savedView } from '../Views/views'
import {
  answerable,
  type FilterGroup,
  type FilterRule,
  mapRules,
  NO_FILTER,
  OPERANDLESS_OPS,
} from '../Views/filterRules'
import { FILEDATA } from '../Properties/properties'
import type { SweepResult } from './governedSweep'
import { type Matcher, stripList } from '../Files/rootValues'
import { tileHostsOf } from '../Tiles/tileHosts'
import type { TilesChanged } from '../Tiles/tiles'
import { liveTreeOf } from './liveTree'
import { editJsonStrict, type StrictEdit, updateNexusConfig } from '../Files/atomicWrite'
import { same } from '../Files/stableJson'
import { errText } from '../Contract/result'
import { sidecarPath, tileDocPath } from '../Paths/paths'
import { SIDECAR_FILENAME, TRASH_DIR } from '../Paths/nexusPaths'
import { type StoredNodes, storedNodes } from './heldPages'
import { asString } from './coerce'
import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
import { sidecarsUnder } from '../Files/walk'
import { readWatchScope } from '../Settings/settings'
import { scopeOf } from '../Settings/codec'
import type { WatchScope } from '../Paths/exclusion'
import { sidecarId } from '../Files/sidecar'
import { isPlainObject } from '../Contract/validators'
import type { CollectionNode, NexusTree, SetNode } from './tree'
import type { ContainerKind, HeldKind } from './entities'
import { archiveReach, containerAt, damagedFolders, trashReach } from './treePatch'

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
  hidden_groups: 'bandKeys',
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
type Gone = { propertyId: string; ids: readonly string[] }
export type ConfigEdit = { kind: 'property'; propertyId: string } | ({ kind: 'gone' } & Gone)

type Raw = Record<string, unknown>
type ViewEdit = (view: Raw) => Raw | null
type Handler<E> = (e: E, held: unknown) => unknown

/** A group the edit leaves without a rule is absent, as the filter pane writes it. */
function editRules(held: unknown, fn: (rule: Raw) => Raw | null): unknown {
  if (!isPlainObject(held) || !Array.isArray(held.rules)) return held
  const group = mapRules(held as unknown as FilterGroup, (r) => fn(r as Raw) as FilterRule | null)
  return group.rules.length > 0 ? group : undefined
}

const onProperty = (id: string, holder: unknown): holder is Raw =>
  isPlainObject(holder) && holder.property_id === id

const clearRule = (id: string, rule: Raw): Raw | null => (onProperty(id, rule) ? null : rule)

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

// A band key a property scopes: one of its own bands, or a Set's sub-band of it.
const ownBand =
  (id: string): Matcher =>
  (el) =>
    typeof el === 'string' && `/${el}`.includes(`/${bandKey(id, '')}`)

// A gone id answers whole or as a key's head (a Set's sub-bands), or as the bucket closing a key its property scopes (an option's bands).
const gone =
  (e: Gone): Matcher =>
  (el) =>
    typeof el === 'string' &&
    e.ids.some((id) => isAtOrUnder(el, id) || `/${el}`.endsWith(`/${bandKey(e.propertyId, id)}`))

const goneRule = (e: Gone, rule: Raw): Raw | null =>
  onProperty(e.propertyId, rule) ? editOperands(rule, (xs) => stripList(xs, gone(e))) : rule

const goneOrder = (e: Gone, holder: unknown): unknown => {
  if (!onProperty(e.propertyId, holder) || !Array.isArray(holder.order)) return holder
  const order = stripList(holder.order, gone(e))
  return order ? { ...holder, order } : holder
}

const keep: Handler<unknown> = (_e, held) => held

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
  bandKeys: (id, held) => (Array.isArray(held) ? (stripList(held, ownBand(id)) ?? held) : held),
}

const stripGone: Handler<Gone> = (e, held) =>
  Array.isArray(held) ? (stripList(held, gone(e)) ?? held) : held

const GONE: Record<Role, Handler<Gone>> = {
  none: keep,
  idList: keep,
  idMap: keep,
  setIds: stripGone,
  rules: (e, held) => editRules(held, (r) => goneRule(e, r)),
  criteria: (e, held) => (Array.isArray(held) ? held.map((c) => goneOrder(e, c)) : held),
  group: goneOrder,
  subGroup: goneOrder,
  bandKeys: stripGone,
}

function viewEdit<E>(table: Record<Role, Handler<E>>, e: E): ViewEdit {
  return (raw) => {
    if (!savedView.safeParse(raw).success) return null
    const next: Raw = { ...raw }
    for (const [field, role] of Object.entries(ROLES) as [keyof SavedView, Role][]) {
      if (role === 'none' || !(field in raw)) continue
      const held = table[role](e, raw[field])
      if (held === undefined) delete next[field]
      else next[field] = held
    }
    return same(raw, next) ? null : next
  }
}

export const propertyClear = (propertyId: string): ViewEdit => viewEdit(CLEAR, propertyId)

function editsOf(e: ConfigEdit): { view: ViewEdit; rule: (rule: Raw) => Raw | null } {
  switch (e.kind) {
    case 'property':
      return { view: propertyClear(e.propertyId), rule: (r) => clearRule(e.propertyId, r) }
    case 'gone':
      return { view: viewEdit(GONE, e), rule: (r) => goneRule(e, r) }
  }
}

// ── Reach ──
export interface ConfigReach {
  skipped: number
  /** The files among `skipped` whose front matter Pommora can't rewrite safely, which a report names once and nothing owes (B-5). */
  refused?: string[]
  hosts: TilesChanged[]
  /** The pages a link sweep wrote, which feed the `pages:changed` push. */
  pages?: string[]
}

export const NO_REACH: ConfigReach = { skipped: 0, hosts: [] }

export const sweptReach = ({ skipped, refused }: SweepResult): ConfigReach => ({
  skipped: skipped.length,
  refused,
  hosts: [],
})

const within = (node: CollectionNode | SetNode): (CollectionNode | SetNode)[] => [
  node,
  ...(node.sets ?? []).flatMap(within),
]

/** The containers a removal took, as locations every saved view, View Tile, and filter drops: read from the tree, or from a stored container's sidecars on disk. */
export const goneContainers = (ids: string[]): ConfigEdit => ({
  kind: 'gone',
  propertyId: FILEDATA.location.id,
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
    // A Context's and a Space's views are reached by their delete's finishing arm, by id.
    case 'context':
    case 'space':
      return null
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

const containerSidecarsUnder = async (
  root: string,
  scope: WatchScope,
  abs: string,
): Promise<Container[]> =>
  (await sidecarsUnder(root, scope, abs)).flatMap((file) => {
    const kind = (['collection', 'set'] as const).find(
      (k) => basename(file) === SIDECAR_FILENAME[k],
    )
    return kind ? [{ kind, dir: dirname(file) }] : []
  })

/** The ids of the Sets an archived folder holds, read from their sidecars. */
export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
  const ids = await Promise.all(
    (await containerSidecarsUnder(root, await readWatchScope(root), abs)).flatMap(
      ({ kind, dir }) => (kind === 'set' ? [sidecarId(dir, 'set')] : []),
    ),
  )
  return ids.flatMap((id) => id ?? [])
}

async function storedContainers(
  tree: NexusTree,
  stored: StoredNodes,
  root: string,
  under?: string,
): Promise<Container[]> {
  const rel = under && relative(root, under)
  const archive = archiveReach(tree, rel)
  const scope = scopeOf(tree.config)
  const sidecars = (d: string) => containerSidecarsUnder(root, scope, join(root, d))
  const [archived, trashed] = await Promise.all([
    archive === null ? [] : sidecars(archive),
    sidecars(TRASH_DIR),
  ])
  if (rel === undefined) return [...archived, ...trashed]
  const at = trashed.map(({ dir }) => relative(root, dir))
  const reached = trashReach(tree, await stored.reach(at), rel)
  return [...archived, ...trashed.filter((_, i) => reached(at[i]))]
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
  const stored = await storedNodes(root, tree)
  const tiles = tileHostsOf(root, tree, stored)
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
  for (const { kind, dir } of [...live, ...damaged])
    await written(sidecarPath(dir, kind), (cur) => mapViews(cur, edit))
  for (const { kind, dir } of await storedContainers(tree, stored, root, under)) {
    await written(sidecarPath(dir, kind), (cur) => {
      const id = asString(cur.id)
      // A container the edit names as gone leaves together with everything else it names, so its own views still answer.
      if (id && e.kind === 'gone' && e.ids.includes(id)) return null
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
