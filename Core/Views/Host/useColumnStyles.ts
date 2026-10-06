import { useCallback, useMemo } from 'react'
import {
  dateDefaults,
  defaultStyleFor,
  resolveStyle,
  storedPick,
  type ColumnStyle,
  type DateFormat,
  type TimeFormat,
} from '../../Properties/columnStyles'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView, ViewPatch } from '../views'
import { declaredType } from '../../Properties/value'
import type { ViewHostApi } from './useViewHost'
import { useSetting } from '../../Session/store'

/** The Nexus's own date form and clock, which a column follows until it picks its own. */
export interface NexusForms {
  dateFormat: DateFormat
  clock: TimeFormat
}

const columnDefaults = (
  columnId: string,
  schema: PropertyDefinition[],
  nexus: NexusForms,
): ColumnStyle => ({
  ...dateDefaults(nexus.dateFormat),
  ...defaultStyleFor(
    declaredType(columnId, schema),
    schema.find((d) => d.id === columnId),
  ),
})

export function styleFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: Pick<SavedView, 'column_styles'>,
  nexus: NexusForms,
): ColumnStyle {
  return resolveStyle(
    view.column_styles?.[columnId],
    columnDefaults(columnId, schema, nexus),
    nexus.clock,
  )
}

/** What a column stores for a pick from its style menu. */
export function pickedStyle(
  columnId: string,
  schema: PropertyDefinition[],
  nexus: NexusForms,
  key: keyof ColumnStyle & string,
  value: string,
): string | undefined {
  return storedPick(key, value, columnDefaults(columnId, schema, nexus), nexus.clock)
}

export function columnStylePatch(
  view: SavedView,
  schema: PropertyDefinition[],
  nexus: NexusForms,
  columnId: string,
  patch: Partial<ColumnStyle>,
): ViewPatch {
  const picks = Object.entries(patch).map(([key, value]) => [
    key,
    pickedStyle(columnId, schema, nexus, key as keyof ColumnStyle & string, String(value)),
  ])
  return {
    column_styles: {
      [columnId]: { ...view.column_styles?.[columnId], ...Object.fromEntries(picks) },
    },
  }
}

export function useNexusForms(): NexusForms {
  const dateFormat = useSetting('dateFormat')
  const clock = useSetting('timeFormat')
  return useMemo(() => ({ dateFormat, clock }), [dateFormat, clock])
}

export function useStyleFor(): (
  columnId: string,
  schema: PropertyDefinition[],
  view: Pick<SavedView, 'column_styles'>,
) => ColumnStyle {
  const nexus = useNexusForms()
  return useCallback((columnId, schema, view) => styleFor(columnId, schema, view, nexus), [nexus])
}

/** Every rendered column's resolved style, keyed by id — one fold of the saved entries over the type defaults for whichever view kind paints them. */
export function useColumnStyleMap(
  host: Pick<ViewHostApi, 'columns' | 'schema' | 'view'>,
): Map<string, ColumnStyle> {
  const { columns, schema, view } = host
  const styleFor = useStyleFor()
  return useMemo(
    () => new Map(columns.map((c) => [c.id, styleFor(c.id, schema, view)])),
    [columns, schema, view, styleFor],
  )
}
