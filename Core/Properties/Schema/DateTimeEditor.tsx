import {
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  type ColumnStyle,
  type DateFormat,
  type TimeFormat,
  type WeekdayFormat,
} from '@pommora/core/Properties/columnStyles'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import { MenuRowView, type MenuRow } from '@pommora/uix/Menus'

const DATE_OPTIONS = DATE_FORMATS.map((value) => ({ value, label: DATE_FORMAT_LABELS[value] }))
const WEEKDAY_OPTIONS: { value: WeekdayFormat; label: string }[] = [
  { value: 'long', label: 'Full' },
  { value: 'short', label: 'Short' },
  { value: 'none', label: 'Hidden' },
]
const TIME_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: 'twelveHour', label: '12 Hours' },
  { value: 'twentyFourHour', label: '24 Hours' },
  { value: 'none', label: 'Hidden' },
]

const pickerRow = <T extends string>(
  glyph: IconName,
  label: string,
  ariaLabel: string,
  value: T,
  options: { value: T; label: string }[],
  onPick: (v: T) => void,
  reveal?: boolean,
): MenuRow => ({
  kind: 'item',
  inert: true,
  icon: <Icon name={glyph} size="headline" />,
  label,
  trailing: { kind: 'picker', ariaLabel, value, options, onPick },
  reveal,
})

/** Time stays visible under Relative — it still gates the "at <clock>" rendering. */
export function DateTimeEditor({
  style,
  onChange,
}: {
  style: ColumnStyle
  onChange: (patch: Partial<ColumnStyle>) => void
}): React.JSX.Element {
  const dateFmt: DateFormat = style.date_format ?? 'full'
  const showDay = dateFmt === 'short' || dateFmt === 'full'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <MenuRowView row={{ kind: 'heading', label: 'Format' }} />
      <MenuRowView
        row={pickerRow('calendar-days', 'Date', 'Date format', dateFmt, DATE_OPTIONS, (v) =>
          onChange({ date_format: v }),
        )}
      />
      <MenuRowView
        row={pickerRow(
          'calendar',
          'Day',
          'Weekday format',
          style.weekday ?? 'none',
          WEEKDAY_OPTIONS,
          (v) => onChange({ weekday: v }),
          showDay,
        )}
      />
      <MenuRowView
        row={pickerRow(
          'clock',
          'Time',
          'Time format',
          style.time_format ?? 'none',
          TIME_OPTIONS,
          (v) => onChange({ time_format: v }),
        )}
      />
    </div>
  )
}
