import type { ColumnStyle, DateFormat } from '../columnStyles'
import type { PropertyValue } from '../propertyValue'
import { CalendarPicker } from '@pommora/uix/Pickers/CalendarPicker'
import { useSetting } from '../../Session/store'
import { formatDate, readDate } from '../formatValue'

/** A picker names a date outright, so a relative form shows as the short one. */
export const dateFormFor = (form: DateFormat): DateFormat => (form === 'relative' ? 'short' : form)

export function DateTimeValuePicker({
  value,
  dateFormat,
  timeFormat,
  span = false,
  onCommit,
}: {
  value: PropertyValue | null
  dateFormat?: ColumnStyle['date_format']
  timeFormat?: ColumnStyle['time_format']
  /** Offers the End Date switch; a filter operand names one moment, so only a value's own picker passes it. */
  span?: boolean
  onCommit: (value: PropertyValue | null) => void
}): React.JSX.Element {
  const nexusClock = useSetting('timeFormat')
  // A hidden time still edits on a clock: the Nexus's.
  const clock = timeFormat && timeFormat !== 'none' ? timeFormat : nexusClock
  const nexusDate = useSetting('dateFormat')
  const fmt = dateFormFor(dateFormat ?? nexusDate)
  return (
    <CalendarPicker
      span={span}
      value={value?.kind === 'dateTime' ? readDate(value.value) : null}
      timeFormat={clock}
      formatDateValue={(k) => formatDate(k, fmt, 'none')}
      onChange={(iso) => onCommit(iso ? { kind: 'dateTime', value: iso } : null)}
    />
  )
}
