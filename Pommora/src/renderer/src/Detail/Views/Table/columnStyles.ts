import { defaultStyleFor, type ColumnStyle } from '@shared/columnStyles'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { declaredType } from '../pipeline/value'

/** The resolved style for a column: the saved entry's defined keys win over the type defaults
 *  (a caught-invalid saved value parses to `undefined` and must not erase a default). */
export function styleFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
): ColumnStyle {
  const saved = Object.entries(view.column_styles?.[columnId] ?? {}).filter(
    ([, v]) => v !== undefined,
  )
  return { ...defaultStyleFor(declaredType(columnId, schema)), ...Object.fromEntries(saved) }
}
