import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { CalendarPicker } from '@pommora/uix/Pickers/CalendarPicker/CalendarPicker'
import { useSession } from '../../Session/store'
import { formatDate } from '../formatValue'

export function DatetimeValuePicker({
  value,
  dateFormat,
  onCommit,
}: {
  value: PropertyValue | null
  dateFormat?: ColumnStyle['date_format']
  onCommit: (value: PropertyValue | null) => void
}): React.JSX.Element {
  const timeFormat = useSession((s) => s.personalization.timeFormat)
  const fmt = dateFormat === 'relative' ? 'short' : (dateFormat ?? 'full')
  return (
    <CalendarPicker
      range={false}
      value={value?.kind === 'datetime' ? value.value : null}
      timeFormat={timeFormat}
      formatDateValue={(k) => formatDate(k, fmt, 'none')}
      onChange={(iso) => onCommit(iso ? { kind: 'datetime', value: iso } : null)}
    />
  )
}
