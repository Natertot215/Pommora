import { useCallback } from 'react'
import { defaultStyleFor, type ColumnStyle, type DateFormat } from '@shared/columnStyles'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { declaredType } from '@renderer/Views/pipeline/value'
import { useSession } from '@renderer/store'

/** The resolved style for a column: the saved entry's defined keys win over the type defaults
 *  (a caught-invalid saved value parses to `undefined` and must not erase a default). The nexus's
 *  own date form rides in as a default, so a column that never set one follows the nexus. */
export function styleFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
  nexusDateFormat?: DateFormat,
): ColumnStyle {
  const saved = Object.entries(view.column_styles?.[columnId] ?? {}).filter(
    ([, v]) => v !== undefined,
  )
  const def = schema.find((d) => d.id === columnId)
  return {
    ...defaultStyleFor(declaredType(columnId, schema), def, nexusDateFormat),
    ...Object.fromEntries(saved),
  }
}

/** `styleFor` bound to the nexus's own date form. Every surface that resolves a column style reads
 *  it through this, so a column that never set a date form follows the nexus the moment it changes. */
export function useStyleFor(): (
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
) => ColumnStyle {
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  return useCallback(
    (columnId, schema, view) => styleFor(columnId, schema, view, nexusDateFormat),
    [nexusDateFormat],
  )
}
