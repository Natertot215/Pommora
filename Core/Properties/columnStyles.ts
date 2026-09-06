import { z } from 'zod'
import { DEFAULT_LINK_DISPLAY, LINK_DISPLAYS, type PropertyDefinition } from './properties'

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

/** Loose + per-field catch ⇒ a bad value drops that field, never the entry; unknown keys ride through. */
export const columnStyle = z.looseObject({
  look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
  date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
  time_format: z.enum(TIME_FORMATS).optional().catch(undefined),
  weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
})
export type ColumnStyle = z.infer<typeof columnStyle>

export function defaultStyleFor(
  declaredType: string | undefined,
  def?: Pick<PropertyDefinition, 'link_display'>,
  nexusDateFormat?: DateFormat,
): ColumnStyle {
  switch (declaredType) {
    case 'status':
    case 'select':
    case 'multi_select':
      return { look: 'standard' }
    case 'checkbox':
      return { look: 'checkbox' }
    // A url column reads the way its property says to unless this view says otherwise — so the property's Format is the default here rather than a constant that would silently override it.
    case 'url':
      return { look: def?.link_display ?? DEFAULT_LINK_DISPLAY }
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return { date_format: nexusDateFormat ?? 'full', time_format: 'none', weekday: 'none' }
    case 'number':
      return { look: 'number' }
    default:
      return {}
  }
}
