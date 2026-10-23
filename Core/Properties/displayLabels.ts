import { LINK_DISPLAY_LABELS } from '../Connections/linkValue'
import {
  type ColumnLook,
  DATE_FORMATS,
  type DateFormat,
  type TimeFormat,
  type WeekdayFormat,
} from './columnStyles'

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

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  twelveHour: '12 Hours',
  twentyFourHour: '24 Hours',
  none: 'Hidden',
}

export const WEEKDAY_FORMAT_LABELS: Record<WeekdayFormat, string> = {
  long: 'Full',
  short: 'Short',
  none: 'Hidden',
}
