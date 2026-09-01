// Per-view column display styles — the `column_styles` record on a SavedView.

import { z } from 'zod'
import { DEFAULT_LINK_DISPLAY, LINK_DISPLAYS, type PropertyDefinition } from './properties'

/** A url column's looks ARE the link forms — one vocabulary for how a link reads, whether from a
 *  property's own Format, a view's column, or a link in a page body. */
export const COLUMN_LOOKS = [
  'standard',
  'compact',
  'checkbox',
  'switch',
  ...LINK_DISPLAYS,
  'number',
  'bar',
] as const
export type ColumnLook = (typeof COLUMN_LOOKS)[number]

export const DATE_FORMATS = ['monthDayYear', 'dayMonthYear', 'short', 'full', 'relative'] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

/** How each date form is named wherever one is offered — the column menu's style rows and the
 *  nexus-wide default alike, so the two can never drift into two vocabularies. */
export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  monthDayYear: 'MM/DD/YYYY',
  dayMonthYear: 'DD/MM/YYYY',
  short: 'Short Date',
  full: 'Full Date',
  relative: 'Relative',
}

export const TIME_FORMATS = ['none', 'twelveHour', 'twentyFourHour'] as const
export type TimeFormat = (typeof TIME_FORMATS)[number]

export const WEEKDAY_FORMATS = ['long', 'short', 'none'] as const
export type WeekdayFormat = (typeof WEEKDAY_FORMATS)[number]

/** Loose + per-field catch ⇒ a bad value drops that field, never the entry; unknown keys ride
 *  through. Number FORMAT is def-level (property-wide), not here — a number's per-view style is
 *  just its `look` (number/bar). */
export const columnStyle = z.looseObject({
  look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
  date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
  time_format: z.enum(TIME_FORMATS).optional().catch(undefined),
  weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
})
export type ColumnStyle = z.infer<typeof columnStyle>

/** String-keyed so `shared/` needs nothing from the renderer's `declaredType`. */
export function defaultStyleFor(
  declaredType: string | undefined,
  /** The column's property, for the one type whose default look is a setting rather than a constant. */
  def?: Pick<PropertyDefinition, 'link_display'>,
  /** The nexus's own date form. Absent falls to `full`, so an unset nexus reads as it always has. */
  nexusDateFormat?: DateFormat,
): ColumnStyle {
  switch (declaredType) {
    // Status and select/multi share the Standard/Compact axis; the shape stays each type's own.
    case 'status':
    case 'select':
    case 'multi_select':
      return { look: 'standard' }
    case 'checkbox':
      return { look: 'checkbox' }
    // A url column reads the way its property says to unless this view says otherwise — so the
    // property's Format is the default here rather than a constant that would silently override it.
    case 'url':
      return { look: def?.link_display ?? DEFAULT_LINK_DISPLAY }
    case 'datetime':
    case 'last_edited_time':
      return { date_format: nexusDateFormat ?? 'full', time_format: 'none', weekday: 'none' }
    case 'number':
      return { look: 'number' }
    default:
      return {}
  }
}
