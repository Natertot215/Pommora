// Per-view column display styles — the `column_styles` record on a SavedView.

import { z } from 'zod'
import { DEFAULT_LINK_DISPLAY, LINK_DISPLAYS, type PropertyDefinition } from './properties'

/** A url column's looks ARE the link forms — one vocabulary for how a link reads, whether it is read
 *  from a property's own Format, a view's column, or a link in a page body. The two it used to carry
 *  (`title`, `full`) named the same idea in words nothing else used, and offered two of three. They
 *  are simply gone: the schema drops a value it no longer knows, so a column saved with one falls
 *  back to its property's Format, which is what it was showing anyway. */
export const COLUMN_LOOKS = [
  'pill',
  'capsule',
  'checkbox',
  'switch',
  ...LINK_DISPLAYS,
  'filename',
  'path',
  'number',
  'bar',
] as const
export type ColumnLook = (typeof COLUMN_LOOKS)[number]

export const DATE_FORMATS = ['short', 'full', 'dayMonthYear', 'monthDayYear', 'relative'] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

export const TIME_FORMATS = ['none', 'twelveHour', 'twentyFourHour'] as const
export type TimeFormat = (typeof TIME_FORMATS)[number]

export const WEEKDAY_FORMATS = ['long', 'short', 'none'] as const
export type WeekdayFormat = (typeof WEEKDAY_FORMATS)[number]

/** One column's saved style entry. Loose + per-field catch ⇒ a bad value drops that field,
 *  never the entry; unknown keys ride through. Number FORMAT is def-level (property-wide), not here —
 *  a number's per-view style is its `look` (number/bar). */
export const columnStyle = z.looseObject({
  look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
  date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
  time_format: z.enum(TIME_FORMATS).optional().catch(undefined),
  weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
})
export type ColumnStyle = z.infer<typeof columnStyle>

/** The type-default style — string-keyed so `shared/` needs nothing from the renderer's
 *  `declaredType`. Select/multi aren't style-addressable: their chips always render pill. */
export function defaultStyleFor(
  declaredType: string | undefined,
  /** The column's property, for the one type whose default look is a setting rather than a constant. */
  def?: Pick<PropertyDefinition, 'link_display'>,
): ColumnStyle {
  switch (declaredType) {
    case 'status':
      return { look: 'pill' }
    case 'checkbox':
      return { look: 'checkbox' }
    // A url column reads the way its property says to unless this view says otherwise — so the
    // property's Format is the default here rather than a constant that would silently override it.
    case 'url':
      return { look: def?.link_display ?? DEFAULT_LINK_DISPLAY }
    case 'file':
      return { look: 'filename' }
    case 'datetime':
    case 'last_edited_time':
      return { date_format: 'full', time_format: 'none', weekday: 'none' }
    case 'number':
      return { look: 'number' }
    default:
      return {}
  }
}
