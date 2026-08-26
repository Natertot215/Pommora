import type { PropertyDefinition } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import type { ColumnAlign, SavedView } from '@shared/views'
import { declaredType } from '@renderer/Views/pipeline/value'

// The chip- and box-shaped values center; so does a datetime, whose formatted value reads centered.
// The reserved Modified timestamp keeps Title's left metadata treatment.
const CENTERED = new Set(['checkbox', 'status', 'select', 'multi_select', 'context', 'datetime'])

/** The default alignment for a column, from its declared type. Title is always left (its primary
 *  icon+text treatment); unknown types fall back to left. `contextIds` is what makes a Context
 *  column classify as such — omit it and one reads as an unknown type. */
export function defaultAlignFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnAlign {
  if (columnId === RESERVED_PROPERTY_ID.title) return 'left'
  const t = declaredType(columnId, schema, contextIds)
  return t !== undefined && CENTERED.has(t) ? 'center' : 'left'
}

export function alignFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
  contextIds: readonly string[] = [],
): ColumnAlign {
  return view.column_alignments?.[columnId] ?? defaultAlignFor(columnId, schema, contextIds)
}
