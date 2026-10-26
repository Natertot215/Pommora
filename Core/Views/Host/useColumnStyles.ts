import { useMemo } from 'react'
import {
  dateDefaults,
  defaultStyleFor,
  resolveStyle,
  storedPick,
  type ColumnStyle,
  type DateFormat,
  type TimeFormat,
} from '../../Properties/columnStyles'
import type { SavedView, ViewPatch } from '../views'
import type { ResolvedColumn } from '../viewRow'
import { useSetting } from '../../Session/store'

/** The Nexus's own date form and clock, which a column follows until it picks its own. */
interface NexusForms {
  dateFormat: DateFormat
  clock: TimeFormat
}

const columnDefaults = ({ type, def }: ResolvedColumn, nexus: NexusForms): ColumnStyle => ({
  ...dateDefaults(nexus.dateFormat),
  ...defaultStyleFor(type, def),
})

export function styleFor(
  column: ResolvedColumn,
  view: Pick<SavedView, 'column_styles'>,
  nexus: NexusForms,
): ColumnStyle {
  return resolveStyle(view.column_styles?.[column.id], columnDefaults(column, nexus), nexus.clock)
}

/** What a column stores for a pick from its style menu. */
export function pickedStyle(
  column: ResolvedColumn,
  nexus: NexusForms,
  key: keyof ColumnStyle & string,
  value: string,
): string | undefined {
  return storedPick(key, value, columnDefaults(column, nexus), nexus.clock)
}

export function columnStylePatch(
  view: SavedView,
  column: ResolvedColumn,
  nexus: NexusForms,
  patch: Partial<ColumnStyle>,
): ViewPatch {
  const picks = Object.entries(patch).map(([key, value]) => [
    key,
    pickedStyle(column, nexus, key as keyof ColumnStyle & string, String(value)),
  ])
  return {
    column_styles: {
      [column.id]: { ...view.column_styles?.[column.id], ...Object.fromEntries(picks) },
    },
  }
}

export function useNexusForms(): NexusForms {
  const dateFormat = useSetting('dateFormat')
  const clock = useSetting('timeFormat')
  return useMemo(() => ({ dateFormat, clock }), [dateFormat, clock])
}
