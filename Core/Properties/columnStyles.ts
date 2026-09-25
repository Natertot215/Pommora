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

export const DATE_FORMAT_OPTIONS = DATE_FORMATS.map((value) => ({
  value,
  label: DATE_FORMAT_LABELS[value],
}))

export const TIME_FORMATS = ['twelveHour', 'twentyFourHour', 'none'] as const
export type TimeFormat = (typeof TIME_FORMATS)[number]

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
  none: 'Hidden',
}

export const WEEKDAY_FORMATS = ['long', 'short', 'none'] as const
export type WeekdayFormat = (typeof WEEKDAY_FORMATS)[number]

export const WEEKDAY_FORMAT_LABELS: Record<WeekdayFormat, string> = {
  long: 'Full',
  short: 'Short',
  none: 'Hidden',
}

/** Only the worded forms have room for a weekday. */
export const showsWeekday = (format: DateFormat | undefined): boolean =>
  format === 'short' || format === 'full'

/** Loose + per-field catch ⇒ a bad value drops that field, never the entry; unknown keys ride through. */
export const columnStyle = z.looseObject({
  look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
  date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
  // `shown` is a time on the Nexus clock, which the column keeps following.
  time_format: z
    .enum([...TIME_FORMATS, 'shown'])
    .optional()
    .catch(undefined),
  weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
})
export type StoredColumnStyle = z.infer<typeof columnStyle>
export type ColumnStyle = StoredColumnStyle & { time_format?: TimeFormat }

/** The stored entry's defined keys win over the defaults — a caught-invalid value parses to `undefined` and must not erase one — and a shown time reads the Nexus clock. */
export function resolveStyle(
  stored: StoredColumnStyle | undefined,
  defaults: ColumnStyle,
  clock: TimeFormat,
): ColumnStyle {
  const { time_format, ...saved } = Object.fromEntries(
    Object.entries(stored ?? {}).filter(([, v]) => v !== undefined),
  ) as StoredColumnStyle
  return {
    ...defaults,
    ...saved,
    ...(time_format && { time_format: time_format === 'shown' ? clock : time_format }),
  }
}

/** What a pick stores: nothing when it matches the default, so the date or clock goes on following the Nexus. */
export function storedPick(
  key: keyof ColumnStyle & string,
  value: string,
  defaults: ColumnStyle,
  clock: TimeFormat,
): string | undefined {
  if (value === defaults[key]) return undefined
  return key === 'time_format' && value === clock ? 'shown' : value
}

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
