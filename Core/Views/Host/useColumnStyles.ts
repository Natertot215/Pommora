import { useCallback, useMemo } from 'react'
import {
  defaultStyleFor,
  type ColumnStyle,
  type DateFormat,
} from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { declaredType } from '../../Properties/value'
import type { ViewHostApi } from './useViewHost'
import { useSession } from '../../Session/store'

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

export const NO_STYLE: ColumnStyle = {}

/** Every rendered column's resolved style, keyed by id — one fold of the saved entries over the type defaults for whichever view kind paints them. */
export function useColumnStyleMap(
  host: Pick<ViewHostApi, 'columns' | 'schema' | 'liveView'>,
): Map<string, ColumnStyle> {
  const { columns, schema, liveView } = host
  const nexusDateFormat = useSession((s) => s.personalization.dateFormat)
  return useMemo(
    () => new Map(columns.map((c) => [c.id, styleFor(c.id, schema, liveView, nexusDateFormat)])),
    [columns, schema, liveView, nexusDateFormat],
  )
}

/** Fold style overrides per-KEY: style entries are objects, so an entry-level spread would wipe a column's saved sibling keys. */
export function mergeStyleRecords(
  saved: Record<string, ColumnStyle> | undefined,
  overrides: Record<string, ColumnStyle>,
): Record<string, ColumnStyle> {
  const folded = Object.fromEntries(
    Object.entries(overrides).map(([id, s]) => [id, { ...saved?.[id], ...s }]),
  )
  return { ...saved, ...folded }
}
