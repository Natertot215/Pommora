// Each enum has ONE source: an `as const` array drives both the TS type and the zod codec / runtime membership Set — never re-listed.

import { z } from 'zod'
import { columnStyle, type ColumnStyle } from '../Properties/columnStyles'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '../Properties/properties'

const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]

const VIEW_FORMATS = ['standard', 'compact'] as const
type ViewFormat = (typeof VIEW_FORMATS)[number]

export const isCompact = (view: { format?: ViewFormat }): boolean =>
  (view.format ?? 'standard') === 'compact'

const CARD_BANNERS = ['image', 'preview', 'none'] as const
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

export interface SortCriterion {
  property_id: string
  direction: (typeof SORT_DIRECTIONS)[number]
  order?: string[]
}

export interface FilterRule {
  property_id: string
  op: string
  value?: string
  values?: string[]
}

/** RECURSIVE: a child may itself be a FilterGroup, expressing mixed AND/OR. Whether the filter APPLIES is a separate axis (`filter_enabled`), so turning it off never costs it its authored mode. */
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
      hide_empty_groups: boolean
    }

export interface SavedView {
  id: string
  name: string
  icon?: string
  color?: string
  type: ViewType
  property_order: string[]
  hidden_properties: string[]
  column_widths?: Record<string, number>
  column_alignments?: Record<string, ColumnAlign>
  column_styles?: Record<string, ColumnStyle>
  collapsed_groups?: string[]
  manual_order?: string[]
  hidden_groups?: string[]
  hide_empty_groups?: boolean
  card_size?: number
  view_scale?: number
  card_banner?: CardBanner
  hide_location?: boolean
  wrap_titles?: boolean
  set_cards?: boolean
  hide_page_icons?: boolean
  hide_column_icons?: boolean
  hide_borders?: boolean
  sort?: SortCriterion[]
  filter?: FilterGroup
  filter_enabled?: boolean
  group?: GroupConfig
  format?: ViewFormat
  group_order?: string[]
  structural_order_mode?: StructuralOrderMode
  location_order_mode?: StructuralOrderMode
  sub_group?: SubGroupConfig
  ungrouped_placement?: EmptyPlacement
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

// Element-filtering, not whole-array catch: one bad entry drops alone, good ids survive.
const idArray = z
  .array(z.unknown())
  .catch([])
  .transform((a) => a.filter((x): x is string => typeof x === 'string'))

const GROUP_ORDER_MODE_SET = new Set<string>(GROUP_ORDER_MODES)
const DATE_GRANULARITY_SET = new Set<string>(DATE_GRANULARITIES)

const VIEW_STATE_KEYS = ['collapsed_groups', 'manual_order'] as const
export type ViewState = Pick<SavedView, (typeof VIEW_STATE_KEYS)[number]>

export function pickViewState(view: SavedView): ViewState {
  return Object.fromEntries(VIEW_STATE_KEYS.map((k) => [k, view[k]])) as ViewState
}

function asEnum<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : undefined
}

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

/** Never throws; an unknown or malformed shape degrades to `structural` — a throw would poison the whole sidecar decode. */
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

/** Loose ⇒ foreign keys survive a rewrite (cloud-sync / agent-legibility); scalar fields decode defensively. */
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
  manual_order: idArray.optional(),
  hidden_groups: z.array(z.string()).optional(),
  hide_empty_groups: z.boolean().optional(),
  card_size: z.number().optional().catch(undefined),
  view_scale: z.number().optional().catch(undefined),
  card_banner: z.enum(CARD_BANNERS).optional().catch(undefined),
  hide_location: z.boolean().optional(),
  wrap_titles: z.boolean().optional(),
  set_cards: z.boolean().optional(),
  hide_page_icons: z.boolean().optional(),
  hide_column_icons: z.boolean().optional(),
  hide_borders: z.boolean().optional(),
  sort: z.array(sortCriterion).optional(),
  filter: filterGroup.optional().catch(undefined),
  filter_enabled: z.boolean().optional(),
  group: z.unknown().transform(decodeGroupConfig).optional(),
  format: z.enum(VIEW_FORMATS).optional().catch(undefined),
  group_order: idArray.optional(),
  structural_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
  location_order_mode: z.enum(STRUCTURAL_ORDER_MODES).optional().catch(undefined),
  sub_group: z.unknown().transform(decodeSubGroup).optional(),
  ungrouped_placement: z.enum(EMPTY_PLACEMENTS).optional().catch(undefined),
  date_separator: z.enum(DATE_SEPARATORS).optional().catch(undefined),
})

export const LOCATION_SORT = '__location__'

/** Both the pipeline and the card drag must read the same predicate: when they disagree, one honors a key the other doesn't. */
export function isLocationFsOrder(view: SavedView): boolean {
  return (
    view.sort?.[0]?.property_id === LOCATION_SORT &&
    (view.location_order_mode ?? 'location') === 'location'
  )
}

export const VIEW_ID_PREFIX = 'view_'

/** `shared/` can't import `main/ids`, so main swaps this for a real `view_<ulid>` on first save. */
export const DEFAULT_VIEW_ID = `${VIEW_ID_PREFIX}default`

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
