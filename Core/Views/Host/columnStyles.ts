import { useCallback } from 'react'
import {
  defaultStyleFor,
  type ColumnStyle,
  type DateFormat,
} from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { declaredType } from '../Properties/value'
import { useSession } from '../Session/store'

/** The saved entry's defined keys win over the type defaults — a caught-invalid saved value parses to `undefined` and must not erase a default. */
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
