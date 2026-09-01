// SavedView — the portable, on-disk view config stored in a Collection/Set sidecar's `views[]`
// (snake_case keys on disk). `savedView` (zod) is the codec; the exported interfaces are the
// canonical types consumers use.
//
// Each enum has ONE source: an `as const` array drives both the TS type and the zod codec /
// runtime membership Set — never re-listed (the SOLID_COLORS idiom in types.ts).

import { z } from 'zod'
import { columnStyle, type ColumnStyle } from './columnStyles'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from './properties'

const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]

const VIEW_FORMATS = ['standard', 'compact'] as const
export type ViewFormat = (typeof VIEW_FORMATS)[number]

export const isCompact = (view: { format?: ViewFormat }): boolean =>
  (view.format ?? 'standard') === 'compact'

const CARD_BANNERS = ['cover', 'preview', 'none'] as const
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

/** A property bucketing INSIDE each top-level set band. View-level (like group_order): the one
 *  `group` slot is replaced on a Group By switch, so anything surviving the round trip can't
 *  live on the config object. */
export interface SubGroupConfig {
  property_id: string
  order_mode: GroupOrderMode
  order?: string[]
  date_granularity?: DateGranularity
}

/** `order` is the Custom option ranking for select/status — present means rank by this sequence
 *  (unknowns last), direction moot. */
export interface SortCriterion {
  property_id: string
  direction: (typeof SORT_DIRECTIONS)[number]
  order?: string[]
}

/** `op` is a snake_case raw string (see FILTER_OPS). Both `value`/`values` absent for presence
 *  ops. */
export interface FilterRule {
  property_id: string
  op: string
  value?: string
  values?: string[]
}

/** Rules combined by `match`: all = AND, any = OR — negation lives on the per-rule operators.
 *  RECURSIVE: a child may itself be a FilterGroup, expressing mixed AND/OR like `(A AND B) OR C`.
 *  Whether the filter APPLIES is a separate axis — `filter_enabled` — so turning it off never
 *  costs it its authored mode. */
export interface FilterGroup {
  match: MatchMode
  rules: Array<FilterRule | FilterGroup>
}

export type GroupConfig =
  | { kind: 'structural' }
  | { kind: 'flat' }
  | {
      kind: 'property'
      property_id: string
      order_mode: GroupOrderMode
      order?: string[]
      date_granularity?: DateGranularity
      empty_placement: EmptyPlacement
      hide_empty_groups: boolean
    }

export interface SavedView {
  id: string
  name: string
  icon?: string
  /** Segment-stroke chip key, validated through the chip map at render; absent = neutral hairline. */
  color?: string
  type: ViewType
  property_order: string[]
  hidden_properties: string[]
  column_widths?: Record<string, number>
  column_alignments?: Record<string, ColumnAlign>
  column_styles?: Record<string, ColumnStyle>
  collapsed_groups?: string[]
  /** Option values, set ids, date bucket keys, `sub/<value>` for sub-group buckets. Same key
   *  vocabulary as collapsed_groups. */
  hidden_groups?: string[]
  /** View-level (the ungrouped_placement hoist). The property config's own copy survives only
   *  for decode parity. Absent = off. */
  hide_empty_groups?: boolean
  /** Cards-view card scale — the Scale step's factor (0.5–1.5). Absent = 1. */
  card_size?: number
  /** Cards-view card image source: the page banner (`cover`), the captured thumbnail
   *  (`preview`), or imageless compact cards (`none`). Absent = cover. */
  card_banner?: CardBanner
  hide_location?: boolean
  /** Cards view: off = single-line overflow-scroll. */
  wrap_titles?: boolean
  /** Cards view: the leading Set Cards row. Absent = shown. */
  set_cards?: boolean
  hide_page_icons?: boolean
  /** Hides the type-icon in each column header (the title column never carries one). Other
   *  view types surface this same flag under a different label. */
  hide_column_icons?: boolean
  hide_borders?: boolean
  sort?: SortCriterion[]
  filter?: FilterGroup
  /** Absent = on. Parking a filter keeps its rules and match mode; only application stops. */
  filter_enabled?: boolean
  group?: GroupConfig
  /** Persisted per-view; Cards reads it via `isCompact` to switch layout. */
  format?: ViewFormat
  /** Manual structural band order — ONE flat set-id array covering every nesting level. View-level,
   *  not on `group`: the structural GroupConfig decoder drops extra fields. Unlisted sets trail
   *  in fs order; absent = derive from fs `set_order`. */
  group_order?: string[]
  /** 'location' mirrors the filesystem (drags write fs; group_order is preserved-but-ignored);
   *  absent/'custom' = the view-owned group_order. */
  structural_order_mode?: StructuralOrderMode
  /** The cards Location SORT's own order source — separate from the grouping one, since a cards
   *  view can group structurally AND sort by Location and the two would otherwise shadow each
   *  other. Absent = 'location'. */
  location_order_mode?: StructuralOrderMode
  /** Survives Group By switches by living view-level. */
  sub_group?: SubGroupConfig
  /** One view-level knob for every ungrouped tail. Absent = bottom. */
  ungrouped_placement?: EmptyPlacement
  /** Absent = dash. */
  date_separator?: DateSeparator
}

const sortCriterion = z.object({
  property_id: z.string(),
  direction: z.enum(SORT_DIRECTIONS),
  order: z.array(z.string()).optional(),
})

const filterRule = z.object({
  property_id: z.string(),
  op: z.string(),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
})

const filterGroup: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    match: z.enum(MATCH_MODES),
    rules: z.array(z.union([filterRule, filterGroup])),
  }),
)

const GROUP_ORDER_MODE_SET = new Set<string>(GROUP_ORDER_MODES)
const DATE_GRANULARITY_SET = new Set<string>(DATE_GRANULARITIES)
const EMPTY_PLACEMENT_SET = new Set<string>(EMPTY_PLACEMENTS)

/** How you are LOOKING at a view, as opposed to how it's configured — a config lock never
 *  freezes it: collapsing a band is a way of reading the view, not an edit to it. */
export const VIEW_STATE_KEYS = ['collapsed_groups'] as const
export type ViewState = Pick<SavedView, (typeof VIEW_STATE_KEYS)[number]>

/** Lets a state write land on a frozen view without carrying the config alongside it. */
export function pickViewState(view: SavedView): ViewState {
  return { collapsed_groups: view.collapsed_groups }
}

/** The single guard the lenient group decode reuses for every enum field. */
function asEnum<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : undefined
}

/** Malformed → undefined, never throws (the decodeGroupConfig discipline). */
export function decodeSubGroup(raw: unknown): SubGroupConfig | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const s = raw as Record<string, unknown>
  if (typeof s.property_id !== 'string' || s.property_id === '') return undefined
  const order = Array.isArray(s.order)
    ? (s.order.filter((x) => typeof x === 'string') as string[])
    : undefined
  const granularity = asEnum<DateGranularity>(s.date_granularity, DATE_GRANULARITY_SET)
  return {
    property_id: s.property_id,
    order_mode: asEnum<GroupOrderMode>(s.order_mode, GROUP_ORDER_MODE_SET) ?? 'configured',
    ...(order !== undefined ? { order } : {}),
    ...(granularity !== undefined ? { date_granularity: granularity } : {}),
  }
}

/** Never throws; an unknown or malformed shape degrades to `structural` (a throw would poison
 *  the whole sidecar decode). */
export function decodeGroupConfig(raw: unknown): GroupConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'structural' }
  const obj = raw as Record<string, unknown>
  const kind = typeof obj.kind === 'string' ? obj.kind : undefined

  const asProperty = (): GroupConfig => {
    const order = Array.isArray(obj.order)
      ? (obj.order.filter((x) => typeof x === 'string') as string[])
      : undefined
    const granularity = asEnum<DateGranularity>(obj.date_granularity, DATE_GRANULARITY_SET)
    return {
      kind: 'property',
      property_id: typeof obj.property_id === 'string' ? obj.property_id : '',
      order_mode: asEnum<GroupOrderMode>(obj.order_mode, GROUP_ORDER_MODE_SET) ?? 'configured',
      ...(order !== undefined ? { order } : {}),
      ...(granularity !== undefined ? { date_granularity: granularity } : {}),
      empty_placement: asEnum<EmptyPlacement>(obj.empty_placement, EMPTY_PLACEMENT_SET) ?? 'bottom',
      hide_empty_groups: typeof obj.hide_empty_groups === 'boolean' ? obj.hide_empty_groups : false,
    }
  }

  switch (kind) {
    case 'structural':
      return { kind: 'structural' }
    case 'flat':
      return { kind: 'flat' }
    case 'property':
      return asProperty()
    default:
      return { kind: 'structural' }
  }
}

/** Loose ⇒ foreign keys survive a rewrite (cloud-sync / agent-legibility); scalar fields decode
 *  defensively (`catch` → default). */
export const savedView = z.looseObject({
  id: z.string().catch(''),
  name: z.string().catch('Table'),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(VIEW_TYPES).catch('table'),
  property_order: z.array(z.string()).catch([]),
  hidden_properties: z.array(z.string()).catch([]),
  column_widths: z.record(z.string(), z.number()).optional(),
  column_alignments: z.record(z.string(), z.enum(COLUMN_ALIGNS)).optional(),
  column_styles: z.record(z.string(), columnStyle).catch({}).optional(),
  collapsed_groups: z.array(z.string()).optional(),
  hidden_groups: z.array(z.string()).optional(),
  hide_empty_groups: z.boolean().optional(),
  card_size: z.number().optional().catch(undefined),
  card_banner: z.enum(CARD_BANNERS).optional().catch(undefined),
  hide_location: z.boolean().optional(),
  wrap_titles: z.boolean().optional(),
  set_cards: z.boolean().optional(),
  hide_page_icons: z.boolean().optional(),
  hide_column_icons: z.boolean().optional(),
  hide_borders: z.boolean().optional(),
  sort: z.array(sortCriterion).optional(),
  // Catch, not fail: a filter the schema no longer admits drops alone and the view survives
  // unfiltered; the next save writes clean.
  filter: filterGroup.optional().catch(undefined),
  filter_enabled: z.boolean().optional(),
  group: z.unknown().transform(decodeGroupConfig).optional(),
  format: z.enum(VIEW_FORMATS).optional().catch(undefined),
  // Element-filtering, not whole-array catch: one bad entry drops alone, good ids survive.
  group_order: z
    .array(z.unknown())
    .catch([])
    .transform((a) => a.filter((x): x is string => typeof x === 'string'))
    .optional(),
  structural_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
  location_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
  sub_group: z.unknown().transform(decodeSubGroup).optional(),
  ungrouped_placement: z.enum(EMPTY_PLACEMENTS).optional().catch(undefined),
  date_separator: z.enum(DATE_SEPARATORS).optional().catch(undefined),
})

/** Not a real property — the sorter can't rank location; resolveView orders by structural
 *  position. Its order source is `location_order_mode` (Location = filesystem, Custom = the
 *  view's manual order). */
export const LOCATION_SORT = '__location__'

/** True when a view sorts by Location AND takes the filesystem order — the pipeline flattens the
 *  structural walk, and the card drag's within-band reorder goes inert. Both must read the same
 *  predicate: when they disagree, one honors a key the other doesn't. */
export function isLocationFsOrder(view: SavedView): boolean {
  return (
    view.sort?.[0]?.property_id === LOCATION_SORT &&
    (view.location_order_mode ?? 'location') === 'location'
  )
}

/** Single-sourced so the sentinel and the minted id can't drift. */
export const VIEW_ID_PREFIX = 'view_'

/** Sentinel id for a freshly-minted default view. `shared/` can't import `main/ids`, so main
 *  swaps this for a real `view_<ulid>` on first save (see crud/views). */
export const DEFAULT_VIEW_ID = `${VIEW_ID_PREFIX}default`

/** Every schema id is hidden and Context columns need no entry — absence from property_order IS
 *  hidden for them — so the guaranteed Title is the sole column (verified through
 *  resolveColumns), and the user reveals what they want. */
export function mintNewView(name: string, schema: PropertyDefinition[]): SavedView {
  return {
    id: DEFAULT_VIEW_ID,
    name,
    icon: 'table',
    type: 'table',
    group: { kind: 'structural' },
    property_order: [RESERVED_PROPERTY_ID.title],
    hidden_properties: schema.map((d) => d.id),
  }
}

export function mintDefaultView(schema: PropertyDefinition[]): SavedView {
  return mintNewView('Table', schema)
}
