import type { ColumnStyle, DateFormat, TimeFormat, WeekdayFormat } from '@shared/columnStyles'
import { Icon, type IconName } from '@renderer/DesignSystem/Symbols'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { MenuRowView, type MenuRow } from '@renderer/DesignSystem/Menus'
import * as s from './date-time-editor.css'

const DATE_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'monthDayYear', label: 'MM/DD/YYYY' },
  { value: 'dayMonthYear', label: 'DD/MM/YYYY' },
  { value: 'short', label: 'Short Date' },
  { value: 'full', label: 'Full Date' },
  { value: 'relative', label: 'Relative' },
]
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
): MenuRow => ({
  kind: 'item',
  inert: true,
  icon: <Icon name={glyph} size="headline" />,
  label,
  trailing: { kind: 'picker', ariaLabel, value, options, onPick },
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
    <div className={s.section}>
      <MenuRowView row={{ kind: 'heading', label: 'Format' }} />
      <MenuRowView
        row={pickerRow('calendar-days', 'Date', 'Date format', dateFmt, DATE_OPTIONS, (v) =>
          onChange({ date_format: v }),
        )}
      />
      <Reveal open={showDay} fill>
        <MenuRowView
          row={pickerRow(
            'calendar',
            'Day',
            'Weekday format',
            style.weekday ?? 'none',
            WEEKDAY_OPTIONS,
            (v) => onChange({ weekday: v }),
          )}
        />
      </Reveal>
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
