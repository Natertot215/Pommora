import { LINK_DISPLAY_LABELS, LINK_DISPLAYS } from '../Connections/linkValue'
import { type PickerOption, pickerOptions } from '@pommora/uix/Pickers/PickerControl'
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

export const lookOptions = <L extends ColumnLook>(looks: readonly L[]): PickerOption<L>[] =>
  pickerOptions(looks, LOOK_LABELS)

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  monthDayYear: 'MM/DD/YYYY',
  dayMonthYear: 'DD/MM/YYYY',
  short: 'Short Date',
  full: 'Full Date',
  relative: 'Relative',
}

export const DATE_FORMAT_OPTIONS = pickerOptions(DATE_FORMATS, DATE_FORMAT_LABELS)

export const LINK_DISPLAY_OPTIONS = pickerOptions(LINK_DISPLAYS, LINK_DISPLAY_LABELS)

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
