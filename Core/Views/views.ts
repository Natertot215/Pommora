// Each enum has ONE source: an `as const` array drives both the TS type and the zod codec / runtime membership Set — never re-listed.

import { z } from 'zod'
import { isPlainObject } from '../Contract/validators'
import { newId } from '../Nexus/ids'
import { columnStyle, holdsStyle } from '../Properties/columnStyles'
import { eachOf, entriesOf, looseDecoder, numberCheck } from '../Files/decoders'
import { TENTHS_SCALE, ZOOM } from '../Settings/personalization'
import { mergeKeys } from '../Files/jsonMerge'
import type { Json } from '../Files/stableJson'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '../Properties/properties'

export const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
export const DEFAULT_VIEW_TYPE: ViewType = 'table'

interface ViewKind {
  label: string
  icon: string
  nests: boolean
}

export const VIEW_KINDS: Record<ViewType, ViewKind> = {
  table: { label: 'Table', icon: 'view-table', nests: true },
  cards: { label: 'Cards', icon: 'cards-grid', nests: false },
  list: { label: 'List', icon: 'list-rounded', nests: true },
  gallery: { label: 'Gallery', icon: 'layout-dashboard', nests: true },
  calendar: { label: 'Calendar', icon: 'calendar-days', nests: true },
  timeline: { label: 'Timeline', icon: 'chart-gantt', nests: true },
}

const VIEW_FORMATS = ['standard', 'compact'] as const
export type ViewFormat = (typeof VIEW_FORMATS)[number]

export const isCompact = (view: Pick<SavedView, 'format'>): boolean =>
  viewOption(view, 'format') === 'compact'

const CARD_BANNERS = ['banner', 'preview', 'none'] as const
export type CardBanner = (typeof CARD_BANNERS)[number]

export const COLUMN_ALIGNS = ['left', 'center', 'right'] as const
export type ColumnAlign = (typeof COLUMN_ALIGNS)[number]

const SORT_DIRECTIONS = ['ascending', 'descending'] as const
const MATCH_MODES = ['all', 'any'] as const
export type MatchMode = (typeof MATCH_MODES)[number]

const GROUP_ORDER_MODES = ['configured', 'reversed', 'manual'] as const
export type GroupOrderMode = (typeof GROUP_ORDER_MODES)[number]

const DATE_GRANULARITIES = ['day', 'week', 'month', 'year'] as const
export type DateGranularity = (typeof DATE_GRANULARITIES)[number]

const EMPTY_PLACEMENTS = ['top', 'bottom'] as const
export type EmptyPlacement = (typeof EMPTY_PLACEMENTS)[number]

const STRUCTURAL_ORDER_MODES = ['custom', 'location'] as const
export type StructuralOrderMode = (typeof STRUCTURAL_ORDER_MODES)[number]

const DATE_SEPARATORS = ['dash', 'slash'] as const
export type DateSeparator = (typeof DATE_SEPARATORS)[number]

/** View-level (like group_order): the one `group` slot is replaced on a Group By switch, so anything surviving the round trip can't live on the config object. */
export interface SubGroupConfig {
  property_id: string
  order_mode: GroupOrderMode
  order?: string[]
  date_granularity?: DateGranularity
}

export type GroupConfig =
  | { kind: 'structural' }
  | { kind: 'flat' }
  | ({ kind: 'property' } & SubGroupConfig)

const idArray = eachOf(z.string()).catch([])

const sortCriterion = z.object({
  property_id: z.string(),
  direction: z.enum(SORT_DIRECTIONS),
  order: idArray.optional(),
})
export type SortCriterion = z.infer<typeof sortCriterion>

const filterRule = z.object({
  property_id: z.string(),
  op: z.string(),
  value: z.string().optional(),
  values: idArray.optional(),
})
export type FilterRule = z.infer<typeof filterRule>

/** RECURSIVE: a child may itself be a FilterGroup, expressing mixed AND/OR. Whether the filter APPLIES is a separate axis (`filter_enabled`), so turning it off never costs it its authored mode. */
export type FilterGroup = { match: MatchMode; rules: Array<FilterRule | FilterGroup> }

// A rule this build can't read drops alone, and the rest still filter.
export const filterGroup: z.ZodType<FilterGroup> = z.object({
  match: z.enum(MATCH_MODES),
  get rules() {
    return eachOf(z.union([filterRule, filterGroup]))
  },
})

export const FILTER_OPS = {
  is: 'is',
  isNot: 'is_not',
  contains: 'contains',
  doesNotContain: 'does_not_contain',
  isEmpty: 'is_empty',
  isNotEmpty: 'is_not_empty',
  greaterThan: 'greater_than',
  lessThan: 'less_than',
  onOrAfter: 'on_or_after',
  onOrBefore: 'on_or_before',
  startsWith: 'starts_with',
  containsAll: 'contains_all',
  containsAny: 'contains_any',
  isBefore: 'is_before',
  isAfter: 'is_after',
  greaterOrEqual: 'greater_or_equal',
  lessOrEqual: 'less_or_equal',
  isInside: 'is_inside',
  isNotInside: 'is_not_inside',
} as const

/** The ops that are complete without an operand; everything else is unauthored until one arrives. */
export const OPERANDLESS_OPS = new Set<string>([FILTER_OPS.isEmpty, FILTER_OPS.isNotEmpty])

export const SUBSTRING_OPS = new Set<string>([
  FILTER_OPS.contains,
  FILTER_OPS.doesNotContain,
  FILTER_OPS.startsWith,
])

/** A chip list wins over a single value, as the pane writes one or the other. */
export const ruleOperands = (rule: FilterRule): string[] =>
  rule.values?.length ? rule.values : rule.value != null ? [rule.value] : []

export const answerable = (rule: FilterRule): boolean =>
  OPERANDLESS_OPS.has(rule.op) || ruleOperands(rule).length > 0

export const isGroup = (node: FilterRule | FilterGroup): node is FilterGroup =>
  isPlainObject(node) && Array.isArray((node as { rules?: unknown }).rules)

export function mapRules(
  group: FilterGroup,
  fn: (rule: FilterRule) => FilterRule | null,
): FilterGroup {
  return {
    ...group,
    rules: group.rules.flatMap<FilterRule | FilterGroup>((node) =>
      isGroup(node) ? [mapRules(node, fn)] : isPlainObject(node) ? (fn(node) ?? []) : [node],
    ),
  }
}

function mapList<T>(xs: readonly T[], f: (x: T, i: number) => T | null): T[] | null {
  let found = false
  const next = xs.map((x, i) => {
    const y = f(x, i)
    if (y !== null) found = true
    return y ?? x
  })
  return found ? next : null
}

export function mapViews(doc: Json, fn: (view: Json, i: number) => Json | null): Json | null {
  if (!Array.isArray(doc.views)) return null
  const tile = doc.type === 'view'
  const views = mapList(doc.views as unknown[], (v, i) => {
    const view = tile ? (isPlainObject(v) ? v.config : null) : v
    if (!isPlainObject(view)) return null
    const next = fn(view, i)
    return next && (tile ? { ...(v as Json), config: next } : next)
  })
  return views && { ...doc, views }
}

export function mapTiles(doc: Json, fn: (tile: Json) => Json | null): Json | null {
  if (!Array.isArray(doc.tiles)) return null
  const tiles = mapList(doc.tiles as unknown[], (t) => (isPlainObject(t) ? fn(t) : null))
  return tiles && { ...doc, tiles }
}

const GROUP_ORDER_MODE_SET = new Set<string>(GROUP_ORDER_MODES)
const DATE_GRANULARITY_SET = new Set<string>(DATE_GRANULARITIES)

const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const

export function pickViewState(view: Partial<SavedView>): Partial<SavedView> {
  return Object.fromEntries(VIEW_STATE_KEYS.filter((k) => k in view).map((k) => [k, view[k]]))
}

function asEnum<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : undefined
}

function decodeOrdering(raw: Record<string, unknown>): Omit<SubGroupConfig, 'property_id'> {
  const order = Array.isArray(raw.order)
    ? raw.order.filter((x): x is string => typeof x === 'string')
    : undefined
  const granularity = asEnum<DateGranularity>(raw.date_granularity, DATE_GRANULARITY_SET)
  return {
    order_mode: asEnum<GroupOrderMode>(raw.order_mode, GROUP_ORDER_MODE_SET) ?? 'configured',
    ...(order !== undefined ? { order } : {}),
    ...(granularity !== undefined ? { date_granularity: granularity } : {}),
  }
}

export function decodeSubGroup(raw: unknown): SubGroupConfig | undefined {
  if (!isPlainObject(raw)) return undefined
  if (typeof raw.property_id !== 'string' || raw.property_id === '') return undefined
  return { property_id: raw.property_id, ...decodeOrdering(raw) }
}

/** Never throws; an unknown or malformed shape degrades to `structural` — a throw would poison the whole sidecar decode. */
export function decodeGroupConfig(raw: unknown): GroupConfig {
  if (!isPlainObject(raw)) return { kind: 'structural' }
  const obj = raw
  const kind = typeof obj.kind === 'string' ? obj.kind : undefined

  switch (kind) {
    case 'structural':
      return { kind: 'structural' }
    case 'flat':
      return { kind: 'flat' }
    case 'property':
      return {
        kind: 'property',
        property_id: typeof obj.property_id === 'string' ? obj.property_id : '',
        ...decodeOrdering(obj),
      }
    default:
      return { kind: 'structural' }
  }
}

/** Loose ⇒ foreign keys survive a rewrite (cloud-sync / agent-legibility); every field decodes defensively. */
export const savedView = looseDecoder(
  z.object({
    id: z.string().catch(''),
    name: z.string().catch(VIEW_KINDS[DEFAULT_VIEW_TYPE].label),
    icon: z.string().optional().catch(undefined),
    color: z.string().optional().catch(undefined),
    type: z.enum(VIEW_TYPES).catch(DEFAULT_VIEW_TYPE),
    property_order: idArray,
    hidden_properties: idArray,
    column_widths: entriesOf(z.number()).optional().catch(undefined),
    column_alignments: entriesOf(z.enum(COLUMN_ALIGNS)).optional().catch(undefined),
    column_styles: entriesOf(columnStyle).optional().catch(undefined),
    collapsed_groups: idArray.optional(),
    manual_order: idArray.optional(),
    hidden_groups: idArray.optional(),
    hide_empty_groups: z.boolean().optional().catch(undefined),
    card_size: numberCheck(TENTHS_SCALE).optional().catch(undefined),
    view_scale: numberCheck(ZOOM).optional().catch(undefined),
    card_banner: z.enum(CARD_BANNERS).optional().catch(undefined),
    hide_location: z.boolean().optional().catch(undefined),
    wrap_titles: z.boolean().optional().catch(undefined),
    set_cards: z.boolean().optional().catch(undefined),
    hide_page_icons: z.boolean().optional().catch(undefined),
    hide_column_icons: z.boolean().optional().catch(undefined),
    hide_borders: z.boolean().optional().catch(undefined),
    sort: eachOf(sortCriterion).optional().catch(undefined),
    filter: filterGroup.optional().catch(undefined),
    filter_enabled: z.boolean().optional().catch(undefined),
    group: z.unknown().transform(decodeGroupConfig).optional(),
    format: z.enum(VIEW_FORMATS).optional().catch(undefined),
    group_order: idArray.optional(),
    structural_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
    location_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
    sub_group: z.unknown().transform(decodeSubGroup).optional(),
    ungrouped_placement: z.enum(EMPTY_PLACEMENTS).optional().catch(undefined),
    date_separator: z.enum(DATE_SEPARATORS).optional().catch(undefined),
  }),
)
export type SavedView = z.infer<typeof savedView>

export type ViewFlag = {
  [K in keyof SavedView]-?: SavedView[K] extends boolean | undefined ? K : never
}[keyof SavedView]

type DefaultedOption =
  | ViewFlag
  | 'format'
  | 'card_banner'
  | 'date_separator'
  | 'ungrouped_placement'
  | 'structural_order_mode'
  | 'location_order_mode'

type ViewDefaults = { [K in DefaultedOption]-?: NonNullable<SavedView[K]> }

const VIEW_DEFAULTS: ViewDefaults = {
  hide_empty_groups: false,
  hide_location: false,
  wrap_titles: false,
  set_cards: true,
  hide_page_icons: false,
  hide_column_icons: true,
  hide_borders: false,
  filter_enabled: true,
  format: 'standard',
  card_banner: 'banner',
  date_separator: 'dash',
  ungrouped_placement: 'bottom',
  structural_order_mode: 'custom',
  location_order_mode: 'location',
}

export const viewOption = <K extends DefaultedOption>(
  view: Partial<Pick<ViewDefaults, K>>,
  key: K,
): ViewDefaults[K] => view[key] ?? VIEW_DEFAULTS[key]

export const granularityOf = (
  g: { date_granularity?: DateGranularity } | undefined,
): DateGranularity => g?.date_granularity ?? 'month'

function withoutEmptyStyles({ column_styles, ...view }: Json): Json {
  const kept = Object.entries((column_styles ?? {}) as Json).filter(([, s]) => holdsStyle(s))
  return kept.length > 0 ? { ...view, column_styles: Object.fromEntries(kept) } : view
}

export type ViewPatch = Partial<SavedView>

const ENTRY_KEYS = [
  'column_widths',
  'column_alignments',
  'column_styles',
] as const satisfies readonly (keyof SavedView)[]
export type EntryKey = (typeof ENTRY_KEYS)[number]
const isEntryKey = (k: string): k is EntryKey => (ENTRY_KEYS as readonly string[]).includes(k)

export const slotsOf = (patch: ViewPatch): [key: string, value: unknown][] =>
  Object.entries(patch).flatMap(([k, v]) =>
    isEntryKey(k) && v !== undefined
      ? Object.entries(v as Record<string, unknown>).map(([id, e]): [string, unknown] => [
          `${k}/${id}`,
          e,
        ])
      : [[k, v]],
  )

export function foldView(
  view: SavedView,
  slots: readonly [key: string, value: unknown][],
): SavedView {
  const next: Record<string, unknown> = { ...view }
  for (const [key, value] of slots) {
    const at = key.indexOf('/')
    if (at < 0) next[key] = value
    else {
      const field = key.slice(0, at)
      next[field] = { ...(next[field] as object | undefined), [key.slice(at + 1)]: value }
    }
  }
  return next as SavedView
}

export const applyViewPatch = (view: SavedView, patch: ViewPatch): SavedView =>
  foldView(view, slotsOf(patch))

export function mergeViewEdit(raw: unknown, next: SavedView): Json {
  const stored = savedView.safeParse(raw)
  return withoutEmptyStyles(
    stored.success
      ? mergeKeys(
          stored.data,
          next,
          raw as Json,
          { group: 1, sub_group: 1, column_widths: 1, column_alignments: 1, column_styles: 2 },
          () => 'local',
        )
      : next,
  )
}

export type GroupLevel = 'group' | 'sub'
export type GroupedView = Pick<SavedView, 'group' | 'sub_group' | 'hidden_groups'>

const LEVEL_PREFIX: Record<GroupLevel, string> = { group: '', sub: 'sub/' }

export const groupsOn = (v: GroupedView, level: GroupLevel, propertyId: string): boolean =>
  level === 'group'
    ? v.group?.kind === 'property' && v.group.property_id === propertyId
    : v.sub_group?.property_id === propertyId

const hiddenBucketKey = (level: GroupLevel, propertyId: string, bucket: string): string =>
  `${LEVEL_PREFIX[level]}${propertyId}/${bucket}`

const legacyBucketKey = (
  v: GroupedView,
  level: GroupLevel,
  propertyId: string,
  bucket: string,
): string | undefined =>
  groupsOn(v, level, propertyId) ? `${LEVEL_PREFIX[level]}${bucket}` : undefined

export function isBucketHidden(
  v: GroupedView,
  hidden: ReadonlySet<string>,
  level: GroupLevel,
  propertyId: string,
  bucket: string,
): boolean {
  const legacy = legacyBucketKey(v, level, propertyId, bucket)
  return (
    hidden.has(hiddenBucketKey(level, propertyId, bucket)) ||
    (legacy !== undefined && hidden.has(legacy))
  )
}

export function toggleHiddenBucket(
  v: GroupedView,
  level: GroupLevel,
  propertyId: string,
  bucket: string,
): string[] {
  const held = v.hidden_groups ?? []
  const own = hiddenBucketKey(level, propertyId, bucket)
  const legacy = legacyBucketKey(v, level, propertyId, bucket)
  const shown = held.filter((k) => k !== own && k !== legacy)
  return shown.length < held.length ? shown : [...held, own]
}

export const hiddenBuckets = (v: GroupedView, level: GroupLevel, propertyId: string): string[] => {
  const prefix = hiddenBucketKey(level, propertyId, '')
  return (v.hidden_groups ?? []).flatMap((k) =>
    k.startsWith(prefix) ? [k.slice(prefix.length)] : [],
  )
}

export function editHiddenBucket(
  v: GroupedView,
  propertyId: string,
  from: string,
  to: string | null,
): string[] | null {
  const renamed = new Map<string, string[]>()
  for (const level of ['group', 'sub'] as const) {
    const into = to === null ? [] : [hiddenBucketKey(level, propertyId, to)]
    renamed.set(hiddenBucketKey(level, propertyId, from), into)
    const legacy = legacyBucketKey(v, level, propertyId, from)
    if (legacy !== undefined) renamed.set(legacy, into)
  }
  const held = v.hidden_groups ?? []
  if (!held.some((k) => renamed.has(k))) return null
  return [...new Set(held.flatMap((k) => renamed.get(k) ?? [k]))]
}

export function clearHiddenBuckets(v: GroupedView, propertyId: string): string[] | null {
  const held = v.hidden_groups ?? []
  const own = (k: string): boolean =>
    k.startsWith(hiddenBucketKey('group', propertyId, '')) ||
    k.startsWith(hiddenBucketKey('sub', propertyId, '')) ||
    (groupsOn(v, 'sub', propertyId) && k.startsWith('sub/') && !k.slice(4).includes('/'))
  const next = held.filter((k) => !own(k))
  return next.length === held.length ? null : next
}

export const LOCATION_SORT = '__location__'

const VIEW_ID_PREFIX = 'view_'

export const removedView = z.object({
  view: z.record(z.string(), z.unknown()),
  index: z.number().int().nonnegative(),
  active: z.boolean(),
})
export type RemovedView = z.infer<typeof removedView>

/** The id the unsaved placeholder carries; its first save lands on the container's first readable view, or mints one when it has none. */
export const DEFAULT_VIEW_ID = `${VIEW_ID_PREFIX}default`

export const mintViewId = (): string => `${VIEW_ID_PREFIX}${newId()}`

const ownViewId = (id: unknown): string | undefined =>
  typeof id === 'string' && id !== '' && id !== DEFAULT_VIEW_ID ? id : undefined

/** Whether `id` is the stored view's own id rather than a positional one `viewIdsOf` stood in for it. */
export const ownsViewId = (stored: unknown, id: string): boolean => ownViewId(stored) === id

// A view answers to its stored id; one with none of its own (missing, unsaved, or a sibling's) answers to a positional id no sibling holds until a write mints it one.
export function viewIdsOf(stored: readonly unknown[], slot: (n: number) => string): string[] {
  const taken = new Set<string>()
  const own = stored.map((raw) => {
    const id = ownViewId(raw)
    if (id === undefined || taken.has(id)) return undefined
    taken.add(id)
    return id
  })
  return own.map((id, i) => {
    if (id !== undefined) return id
    let n = i
    while (taken.has(slot(n))) n++
    taken.add(slot(n))
    return slot(n)
  })
}

export const containerViewIds = (views: readonly unknown[]): string[] =>
  viewIdsOf(
    views.map((v) => (v as { id?: unknown } | null)?.id),
    (n) => `${VIEW_ID_PREFIX}${n}`,
  )

export function mintNewView(name: string, schema: PropertyDefinition[]): SavedView {
  return {
    id: mintViewId(),
    name,
    icon: VIEW_KINDS[DEFAULT_VIEW_TYPE].icon,
    type: DEFAULT_VIEW_TYPE,
    group: { kind: 'structural' },
    property_order: [RESERVED_PROPERTY_ID.title],
    hidden_properties: schema.map((d) => d.id),
  }
}

export function mintDefaultView(schema: PropertyDefinition[]): SavedView {
  return mintNewView(VIEW_KINDS[DEFAULT_VIEW_TYPE].label, schema)
}
