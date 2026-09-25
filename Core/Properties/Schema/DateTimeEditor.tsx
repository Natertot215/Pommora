import {
  DATE_FORMAT_OPTIONS,
  showsWeekday,
  TIME_FORMAT_LABELS,
  TIME_FORMATS,
  WEEKDAY_FORMAT_LABELS,
  WEEKDAY_FORMATS,
  type ColumnStyle,
  type DateFormat,
} from '@pommora/core/Properties/columnStyles'
import { MenuRowView, pickerRow } from '@pommora/uix/Menus'

const WEEKDAY_OPTIONS = WEEKDAY_FORMATS.map((value) => ({
  value,
  label: WEEKDAY_FORMAT_LABELS[value],
}))
const TIME_OPTIONS = TIME_FORMATS.map((value) => ({ value, label: TIME_FORMAT_LABELS[value] }))

const ROW_LOOK = { iconSize: 'headline', inert: true } as const

/** Time stays visible under Relative — it still gates the "at <clock>" rendering. */
export function DateTimeEditor({
  style,
  onChange,
}: {
  style: ColumnStyle
  onChange: (patch: Partial<ColumnStyle>) => void
}): React.JSX.Element {
  const dateFmt: DateFormat = style.date_format ?? 'full'
  const showDay = showsWeekday(dateFmt)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <MenuRowView row={{ kind: 'heading', label: 'Format' }} />
      <MenuRowView
        row={pickerRow(
          'calendar-days',
          'Date',
          dateFmt,
          DATE_FORMAT_OPTIONS,
          (v) => onChange({ date_format: v }),
          { ...ROW_LOOK, ariaLabel: 'Date format' },
        )}
      />
      <MenuRowView
        row={pickerRow(
          'calendar',
          'Day',
          style.weekday ?? 'none',
          WEEKDAY_OPTIONS,
          (v) => onChange({ weekday: v }),
          { ...ROW_LOOK, ariaLabel: 'Weekday format', reveal: showDay },
        )}
      />
      <MenuRowView
        row={pickerRow(
          'clock',
          'Time',
          style.time_format ?? 'none',
          TIME_OPTIONS,
          (v) => onChange({ time_format: v }),
          { ...ROW_LOOK, ariaLabel: 'Time format' },
        )}
      />
    </div>
  )
}
