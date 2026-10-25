import { localIso } from '@pommora/uix/Utilities/pad'
import { ID_KEY } from '../Nexus/identityMark'
import { idTime } from '../Nexus/ids'
import { type PageFrontmatter, pageFrontmatter } from '../Nexus/schemas'
import type { ColumnType, PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'

export interface PageValues {
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
}

export function pageValuesOf(
  id: string,
  fm: Record<string, unknown>,
  mtimeMs: number | null,
): PageValues {
  return {
    frontmatter: pageFrontmatter.parse({ ...fm, [ID_KEY]: id }),
    createdAt: localIso(idTime(id)),
    modifiedAt: localIso(mtimeMs),
  }
}

export type RowValues = PageValues & Pick<ViewRow, 'picked'>

/** The values a page's pending writes picked, by field id. */
export type Picked = Record<string, PropertyValue>

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
  picked?: Picked
}

export type ColumnKind = 'title' | 'property' | 'context' | 'stamp'

/** `type` answers what a column's values are; `kind` answers where they're read from (the row, a definition, or the registry), so the two stamps share a kind and differ by type. */
export interface ResolvedColumn {
  id: string
  kind: ColumnKind
  type: ColumnType
  def?: PropertyDefinition
}

interface GroupBase {
  key: string
  items: ViewRow[]
  children?: ResolvedGroup[]
}

export type ResolvedGroup =
  | (GroupBase & { kind: 'set' })
  | (GroupBase & { kind: 'bucket'; value: string })
  | (GroupBase & { kind: 'tail' })

export const isEmptyBand = (group: Pick<GroupBase, 'items' | 'children'>): boolean =>
  group.items.length === 0 && !group.children?.length

/** Stored on disk in `collapsed_groups`, so it round-trips across builds — the single source the pipeline and the render code both match group keys against. */
export const UNGROUPED = '_ungrouped'
