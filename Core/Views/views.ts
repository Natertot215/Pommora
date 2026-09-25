// Each enum has ONE source: an `as const` array drives both the TS type and the zod codec / runtime membership Set — never re-listed.

import { z } from 'zod'
import { isPlainObject } from '../Contract/validators'
import { newId } from '../Nexus/ids'
import { columnStyle, holdsStyle } from '../Properties/columnStyles'
import { eachOf, entriesOf, looseDecoder } from '../Files/decoders'
import { mergeKeys } from '../Files/jsonMerge'
import type { Json } from '../Files/stableJson'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '../Properties/properties'

export const VIEW_TYPES = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
export const DEFAULT_VIEW_TYPE: ViewType = 'table'

interface ViewKind {
  label: string
  icon: string
  flat: boolean
}

export const VIEW_KINDS: Record<ViewType, ViewKind> = {
  // Table indents its structural groups until Table Flatten lands, at which point flatness becomes the view's own setting with the kind as its default.
  table: { label: 'Table', icon: 'view-table', flat: false },
  cards: { label: 'Cards', icon: 'cards-grid', flat: true },
  list: { label: 'List', icon: 'list-rounded', flat: false },
  gallery: { label: 'Gallery', icon: 'layout-dashboard', flat: false },
  calendar: { label: 'Calendar', icon: 'calendar-days', flat: false },
  timeline: { label: 'Timeline', icon: 'chart-gantt', flat: false },
}

const VIEW_FORMATS = ['standard', 'compact'] as const
export type ViewFormat = (typeof VIEW_FORMATS)[number]

export const isCompact = (view: { format?: ViewFormat }): boolean =>
  (view.format ?? 'standard') === 'compact'

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
    card_size: z.number().optional().catch(undefined),
    view_scale: z.number().optional().catch(undefined),
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

function withoutEmptyStyles({ column_styles, ...view }: Json): Json {
  const kept = Object.entries((column_styles ?? {}) as Json).filter(([, s]) => holdsStyle(s))
  return kept.length > 0 ? { ...view, column_styles: Object.fromEntries(kept) } : view
}

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

export const LOCATION_SORT = '__location__'

/** Both the pipeline and the card drag must read the same predicate: when they disagree, one honors a key the other doesn't. */
export function isLocationFsOrder(view: SavedView): boolean {
  return (
    view.sort?.[0]?.property_id === LOCATION_SORT &&
    (view.location_order_mode ?? 'location') === 'location'
  )
}

const VIEW_ID_PREFIX = 'view_'

/** The id an unsaved view carries; `saveView` swaps it for a minted one on first save. */
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
    id: DEFAULT_VIEW_ID,
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
