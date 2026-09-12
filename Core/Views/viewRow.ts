import type { PageFrontmatter } from '../Nexus/schemas'

export const OPEN_INS = ['full-page', 'page-preview'] as const
export type OpenIn = (typeof OPEN_INS)[number]
export const VIEW_BUTTONS = ['icon', 'labeled'] as const
export type ViewButton = (typeof VIEW_BUTTONS)[number]
export const VIEW_STYLES = ['dropdown', 'toolbar'] as const
export type ViewStyle = (typeof VIEW_STYLES)[number]

export interface PageValues {
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
}

/** `frontmatter` is REQUIRED: when values aren't loaded yet, the flatten step supplies an identity-only entry so the row still sorts/groups/filters on intrinsic fields. */
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

export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

export interface ResolvedColumn {
  id: string
  kind: ColumnKind
}

export type GroupKind = 'structural-set' | 'property' | 'ungrouped'

export interface ResolvedGroup {
  key: string
  kind: GroupKind
  items: ViewRow[]
  children?: ResolvedGroup[]
  isCollapsed: boolean
  bucket?: string
}

export const isEmptyBand = (group: Pick<ResolvedGroup, 'items' | 'children'>): boolean =>
  group.items.length === 0 && !group.children?.length

/** Stored on disk in `collapsed_groups`, so it round-trips across builds — the single source the pipeline and the render code both match group keys against. */
export const UNGROUPED = '_ungrouped'
