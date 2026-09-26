import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { CalendarPicker } from '@pommora/uix/Pickers/CalendarPicker'
import { useSetting } from '../../Session/store'
import { formatDate, readDate } from '../formatValue'

export function DateTimeValuePicker({
  value,
  dateFormat,
  timeFormat,
  onCommit,
}: {
  value: PropertyValue | null
  dateFormat?: ColumnStyle['date_format']
  timeFormat?: ColumnStyle['time_format']
  onCommit: (value: PropertyValue | null) => void
}): React.JSX.Element {
  const nexusClock = useSetting('timeFormat')
  // A hidden time still edits on a clock: the Nexus's.
  const clock = timeFormat && timeFormat !== 'none' ? timeFormat : nexusClock
  const nexusDate = useSetting('dateFormat')
  const shown = dateFormat ?? nexusDate
  const fmt = shown === 'relative' ? 'short' : shown
  return (
    <CalendarPicker
      value={value?.kind === 'dateTime' ? readDate(value.value) : null}
      timeFormat={clock}
      formatDateValue={(k) => formatDate(k, fmt, 'none')}
      onChange={(iso) => onCommit(iso ? { kind: 'dateTime', value: iso } : null)}
    />
  )
}
