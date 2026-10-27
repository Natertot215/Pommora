import { z } from 'zod'
import { looseDecoder } from '../Files/decoders'
import { LINK_DISPLAYS } from '../Connections/linkValue'
import type { ColumnType, PropertyDefinition } from './properties'

const OPTION_LOOKS = ['standard', 'compact'] as const
const CHECKBOX_LOOKS = ['checkbox', 'switch'] as const
const NUMBER_LOOKS = ['number', 'bar'] as const
export const COLUMN_LOOKS = [
  ...OPTION_LOOKS,
  ...CHECKBOX_LOOKS,
  ...LINK_DISPLAYS,
  ...NUMBER_LOOKS,
] as const
export type ColumnLook = (typeof COLUMN_LOOKS)[number]

/** The looks a column of each type offers a view, its default first; Date styles by its date, time, and weekday forms instead. */
export const LOOKS = {
  text: [],
  number: NUMBER_LOOKS,
  checkbox: CHECKBOX_LOOKS,
  dateTime: [],
  select: OPTION_LOOKS,
  multiSelect: OPTION_LOOKS,
  status: OPTION_LOOKS,
  link: LINK_DISPLAYS,
  file: [],
  context: [],
  title: [],
  createdTime: [],
  lastEditedTime: [],
} as const satisfies Readonly<Record<ColumnType, readonly ColumnLook[]>>

/** A resolved look as one of the type's own, its default when the stored one names another type's. */
export const lookIn = <L extends ColumnLook>(looks: readonly [L, ...L[]], look?: ColumnLook): L =>
  looks.find((l) => l === look) ?? looks[0]

export const DATE_FORMATS = ['monthDayYear', 'dayMonthYear', 'short', 'full', 'relative'] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

export const TIME_FORMATS = ['twelveHour', 'twentyFourHour', 'none'] as const
export type TimeFormat = (typeof TIME_FORMATS)[number]

export const WEEKDAY_FORMATS = ['long', 'short', 'none'] as const
export type WeekdayFormat = (typeof WEEKDAY_FORMATS)[number]

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
type StoredColumnStyle = z.infer<typeof columnStyle>

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

/** What a pick stores: nothing when it matches the default, so the date or clock goes on following the Nexus; a time shown (`shown`) reads as the clock. */
export function storedPick(
  key: keyof ColumnStyle & string,
  value: string,
  defaults: ColumnStyle,
  clock: TimeFormat,
): string | undefined {
  const picked = key === 'time_format' && value === 'shown' ? clock : value
  if (picked === defaults[key]) return undefined
  return key === 'time_format' && picked === clock ? 'shown' : picked
}

export function defaultStyleFor(
  type: ColumnType | undefined,
  def?: Pick<PropertyDefinition, 'link_display'>,
): Pick<StoredColumnStyle, 'look'> {
  const looks: readonly ColumnLook[] = type === undefined ? [] : LOOKS[type]
  // A Link column reads the way its property says to unless this view says otherwise — so the property's Format is the default here rather than a constant that would silently override it.
  const look = type === 'link' ? (def?.link_display ?? looks.at(0)) : looks.at(0)
  return look === undefined ? {} : { look }
}
