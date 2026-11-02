import { type ColumnType, PROPERTY_TYPES } from '../../Properties/properties'
import type { ResolvedColumn, ViewRow } from '../viewRow'
import { holdsValue } from '../../Properties/fieldValue'
import type { ItemColumns } from '../Pipeline/columns'

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
      (!compactLayout || holdsValue(row, c) || PROPERTY_TYPES[c.type].blankDraws === true),
  )
}

export function cardAddColumns(
  item: ItemColumns,
  row: ViewRow,
  shown: ResolvedColumn[],
): ItemColumns {
  const drawn = new Set(shown.map((c) => c.id))
  const listed = (columns: ResolvedColumn[]): ResolvedColumn[] => {
    const unshown = columns.filter((c) => !drawn.has(c.id))
    return [
      ...unshown.filter((c) => !holdsValue(row, c)),
      ...unshown.filter((c) => holdsValue(row, c)),
    ]
  }
  return { contexts: listed(item.contexts), properties: listed(item.properties) }
}
