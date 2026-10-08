import { z } from 'zod'
import { looseDecoder } from '../Files/decoders'
import {
  DEFAULT_LINK_DISPLAY,
  LINK_DISPLAY_LABELS,
  LINK_DISPLAYS,
  type PropertyDefinition,
  type PropertyType,
  specOf,
} from './properties'

export const OPTION_LOOKS = ['standard', 'compact'] as const
export const CHECKBOX_LOOKS = ['checkbox', 'switch'] as const
export const NUMBER_LOOKS = ['number', 'bar'] as const
export const COLUMN_LOOKS = [
  ...OPTION_LOOKS,
  ...CHECKBOX_LOOKS,
  ...LINK_DISPLAYS,
  ...NUMBER_LOOKS,
] as const
export type ColumnLook = (typeof COLUMN_LOOKS)[number]

export const LOOK_LABELS: Record<ColumnLook, string> = {
  standard: 'Standard',
  compact: 'Compact',
  checkbox: 'Checkbox',
  switch: 'Switch',
  ...LINK_DISPLAY_LABELS,
  number: 'Number',
  bar: 'Bar',
}

export const lookOptions = <L extends ColumnLook>(
  looks: readonly L[],
): { value: L; label: string }[] => looks.map((value) => ({ value, label: LOOK_LABELS[value] }))

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

/** Per-field catch ⇒ a bad value drops that field, never the entry. */
export const columnStyle = looseDecoder(
  z.object({
    look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
    date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
    time_format: z
      .enum([...TIME_FORMATS, 'shown'])
      .optional()
      .catch(undefined),
    weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
  }),
)
export type StoredColumnStyle = z.infer<typeof columnStyle>

export interface DateStyle {
  date_format: DateFormat
  time_format: TimeFormat
  weekday: WeekdayFormat
}
/** Every resolved style carries a whole date style, which only a date column reads. */
export type ColumnStyle = { look?: ColumnLook } & DateStyle

export const holdsStyle = (style: unknown): boolean =>
  typeof style === 'object' && style !== null && Object.values(style).some((v) => v !== undefined)

export const dateDefaults = (dateFormat: DateFormat): DateStyle => ({
  date_format: dateFormat,
  time_format: 'none',
  weekday: 'none',
})

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
  type: PropertyType | 'title' | undefined,
  def?: Pick<PropertyDefinition, 'link_display'>,
): Pick<StoredColumnStyle, 'look'> {
  switch (specOf(type)?.kind) {
    case 'select':
    case 'multiSelect':
      return { look: 'standard' }
    case 'checkbox':
      return { look: 'checkbox' }
    // A Link column reads the way its property says to unless this view says otherwise — so the property's Format is the default here rather than a constant that would silently override it.
    case 'link':
      return { look: def?.link_display ?? DEFAULT_LINK_DISPLAY }
    case 'number':
      return { look: 'number' }
    case 'dateTime':
    case 'context':
    case 'file':
    case 'text':
    case undefined:
      return {}
  }
}
