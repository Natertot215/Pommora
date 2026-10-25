import { type ColumnType, PROPERTY_TYPES, specOf } from '../../Properties/properties'
import { isBlankValue } from '../../Properties/propertyValue'
import type { NexusTree } from '../../Nexus/tree'
import type { ResolvedColumn, ViewRow } from '../viewRow'
import { isCompact, type SavedView } from '../views'
import { hiddenListIds } from '../visibilityModel'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { resolveColumn } from '../Pipeline/columns'
import { columnLabel } from '../../Properties/columnLabel'
import type { ValueContext } from '../../Properties/valueContext'

/** A blank value of this type fills in place, unless the type is Filedata, which has no fill path. */
export const fillsBlank = (type: ColumnType): boolean => PROPERTY_TYPES[type].origin !== 'filedata'

/** Compact's label-less flow can't render an empty value, so it drops blanks, except a type whose blank draws, such as a checkbox's unchecked box, the on-card toggle. */
export function shownColumnsFor(
  row: ViewRow,
  columns: ResolvedColumn[],
  compactLayout: boolean,
): ResolvedColumn[] {
  return columns.filter(
    (c) =>
      c.kind !== 'title' &&
      (!compactLayout ||
        !isBlankValue(resolveFieldValue(row, c)) ||
        specOf(c.type)?.blankDraws === true),
  )
}

export function addEntriesFor(
  row: ViewRow,
  view: SavedView,
  ctx: ValueContext,
  columns: ResolvedColumn[],
  tree: NexusTree | null = null,
): AddEntry[] {
  const contextIds = contextIdsOf(tree)
  const shownIds = new Set(shownColumnsFor(row, columns, isCompact(view)).map((c) => c.id))
  const ids = [
    ...new Set([
      ...hiddenListIds(view, ctx.schema, contextIds),
      ...ctx.schema.map((d) => d.id),
      ...columns.filter((c) => c.kind === 'context').map((c) => c.id),
    ]),
  ]
  return ids.flatMap((id) => {
    const column = shownIds.has(id) ? undefined : resolveColumn(id, ctx.schema, contextIds)
    if (!column) return []
    const blank = isBlankValue(resolveFieldValue(row, column))
    return [
      {
        column,
        name: columnLabel(column, contextsByIdOf(tree)),
        revealOnly: !fillsBlank(column.type) || !blank,
      },
    ]
  })
}

export type AddEntry = {
  column: ResolvedColumn
  name: string
  revealOnly: boolean
}

export function orderAddableEntries(entries: AddEntry[]): AddEntry[] {
  return [...entries.filter((e) => !e.revealOnly), ...entries.filter((e) => e.revealOnly)]
}
