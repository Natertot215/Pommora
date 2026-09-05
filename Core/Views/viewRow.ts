import type { PageFrontmatter } from '../Nexus/schemas'

/** Collection-owned; a Set proxies its parent Collection's value. Each enum has ONE source: the
 *  `as const` array drives both the TS type and the zod codec that reads it off disk. */
export const OPEN_INS = ['full-page', 'page-preview'] as const
export type OpenIn = (typeof OPEN_INS)[number]
export const VIEW_BUTTONS = ['icon', 'labeled'] as const
export type ViewButton = (typeof VIEW_BUTTONS)[number]
export const VIEW_STYLES = ['dropdown', 'toolbar'] as const
export type ViewStyle = (typeof VIEW_STYLES)[number]

/** One page's batch entry for the view pipeline. Both stamps are local-clock ISO 8601, the shape
 *  a date property holds; `createdAt` is null under an adopted id, `modifiedAt` null when the file
 *  could not be stat'd. */
export interface PageValues {
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
}

/** `frontmatter` is REQUIRED: when values aren't loaded yet, the flatten step supplies an
 *  identity-only entry so the row still sorts/groups/filters on intrinsic fields. */
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
  contextValues?: Record<string, string[]>
}

/** `title`/`context`/`stamp` are reserved columns; `property` is a user-defined schema
 *  property. Width + the group/sort hoist are separate render concerns, not modeled here. */
export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

export interface ResolvedColumn {
  id: string
  kind: ColumnKind
}

/** `structural-set` = a Set/Sub-Set disclosure group; `property` = grouped by a property value;
 *  `ungrouped` = the no-value / flat band. */
export type GroupKind = 'structural-set' | 'property' | 'ungrouped'

/** `children` nests Sub-Set groups under a Set group (structural grouping); `items` holds this
 *  group's own rows. `key` is the group's identity — round-trips `collapsed_groups`. Header
 *  labels are derived at render time from `key` + schema, not stored here. */
export interface ResolvedGroup {
  key: string
  kind: GroupKind
  items: ViewRow[]
  children?: ResolvedGroup[]
  isCollapsed: boolean
  /** Sub-group bands only: the raw bucket value (`key` is the composite set/bucket collapse id). */
  bucket?: string
}

/** Stored on disk in `collapsed_groups`, so it round-trips across builds — the single source the
 *  pipeline and the render code both match group keys against. */
export const UNGROUPED = '_ungrouped'
