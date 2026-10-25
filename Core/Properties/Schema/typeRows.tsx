import { PathField } from '@pommora/uix/Fields/PathField'
import { type MenuRow, pickerRow, type Trailing } from '@pommora/uix/Menus'
import { type PickerOption, pickerOptions } from '@pommora/uix/Pickers/PickerControl'
import { resolveColor } from '@pommora/uix/Theme/ramp'
import { numberFrom } from '@pommora/uix/Utilities/numberUnit'
import { DEFAULT_LINK_DISPLAY, type LinkDisplay } from '../../Connections/linkValue'
import { reportRefusal } from '../../Interface/Notifications/notifications'
import { dialer } from '../../Platform/dialer'
import {
  type ColumnStyle,
  LOOKS,
  lookIn,
  showsWeekday,
  TIME_FORMATS,
  WEEKDAY_FORMATS,
} from '../columnStyles'
import {
  DATE_FORMAT_OPTIONS,
  LINK_DISPLAY_OPTIONS,
  lookOptions,
  TIME_FORMAT_LABELS,
  WEEKDAY_FORMAT_LABELS,
} from '../displayLabels'
import { numberBarCapable } from '../formatValue'
import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  type NumberConfig,
  type NumberFamily,
  type PropertyConfig,
  type PropertyDefinition,
  type PropertyType,
} from '../properties'
import { styleLabel } from '../typeDisplay'

/** A type's settings write one of two scopes: `configure` the definition, wherever it's held; `setStyle` this view's column alone. */
type RowContext = {
  style: ColumnStyle
  setStyle: (patch: Partial<ColumnStyle>) => void
  configure: (patch: PropertyConfig) => void
  assetRoot: string
}

const FAMILY_OPTIONS: PickerOption<NumberFamily>[] = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
]
const CURRENCY_OPTIONS: PickerOption<string>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}))
const DECIMAL_OPTIONS: PickerOption<string>[] = [
  { value: 'hidden', label: 'Hidden' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]
const NUMBER_STYLE_OPTIONS = lookOptions(LOOKS.number)
const CHECKBOX_STYLE_OPTIONS = lookOptions(LOOKS.checkbox)
const WEEKDAY_OPTIONS = pickerOptions(WEEKDAY_FORMATS, WEEKDAY_FORMAT_LABELS)
const TIME_OPTIONS = pickerOptions(TIME_FORMATS, TIME_FORMAT_LABELS)

const decimalsToPicker = (d: NumberConfig['number_decimals']): string =>
  typeof d === 'number' ? String(d) : 'hidden'
const pickerToDecimals = (v: string): 'hidden' | number => (v === 'hidden' ? 'hidden' : Number(v))

const ROW = { inert: true } as const
const DATE_ROW = { ...ROW, iconSize: 'headline' } as const

const item = (label: string, trailing: Trailing, reveal?: boolean): MenuRow => ({
  kind: 'item',
  label,
  trailing,
  reveal,
  ...ROW,
})

const colorItem = (
  value: string | undefined,
  fallback: string,
  onPick: (next: string | undefined) => void,
): MenuRow => {
  const { name, css } = resolveColor(value, fallback)
  return item('Color', { kind: 'color', label: 'Color', selected: name, css, onPick })
}

function numberRows(
  def: PropertyDefinition,
  { style, setStyle, configure }: RowContext,
): MenuRow[] {
  const family: NumberFamily = def.number_family ?? 'number'
  const percent = family === 'percent'
  const fraction = def.number_fraction ?? false
  return [
    pickerRow(undefined, 'Format', family, FAMILY_OPTIONS, (v) => configure({ number_family: v }), {
      ...ROW,
      ariaLabel: 'Number format',
    }),
    pickerRow(
      undefined,
      'Currency',
      def.number_currency ?? DEFAULT_CURRENCY,
      CURRENCY_OPTIONS,
      (v) => configure({ number_currency: v }),
      { ...ROW, ariaLabel: 'Currency', reveal: family === 'currency' },
    ),
    item(
      'Separators',
      {
        kind: 'switch',
        checked: def.number_separators ?? true,
        onChange: (next) => configure({ number_separators: next }),
        ariaLabel: 'Separators',
      },
      !percent,
    ),
    pickerRow(
      undefined,
      'Decimals',
      decimalsToPicker(def.number_decimals),
      DECIMAL_OPTIONS,
      (v) => configure({ number_decimals: pickerToDecimals(v) }),
      { ...ROW, ariaLabel: 'Decimal places' },
    ),
    item(
      'Fraction',
      {
        kind: 'switch',
        checked: fraction,
        onChange: (next) => configure({ number_fraction: next }),
        ariaLabel: 'Fraction',
      },
      !percent,
    ),
    pickerRow(undefined, 'Value', '', [], () => {}, {
      ...ROW,
      ariaLabel: 'Fraction value',
      reveal: !percent && fraction,
      typeable: {
        text: String(def.number_denominator ?? ''),
        onCommit: (typed) => {
          const n = numberFrom(typed)
          if (typed === '' || (n !== undefined && n > 0)) configure({ number_denominator: n })
        },
      },
    }),
    pickerRow(
      undefined,
      styleLabel(def.type),
      lookIn(LOOKS.number, style.look),
      NUMBER_STYLE_OPTIONS,
      (look) => setStyle({ look }),
      { ...ROW, ariaLabel: 'Number style', reveal: numberBarCapable(def) },
    ),
  ]
}

/** Time stays visible under Relative — it still gates the "at <clock>" rendering. */
const dateRows = (def: PropertyDefinition, { style, setStyle }: RowContext): MenuRow[] => [
  { kind: 'heading', label: styleLabel(def.type) },
  pickerRow(
    'calendar-days',
    'Date',
    style.date_format,
    DATE_FORMAT_OPTIONS,
    (v) => setStyle({ date_format: v }),
    { ...DATE_ROW, ariaLabel: 'Date format' },
  ),
  pickerRow('calendar', 'Day', style.weekday, WEEKDAY_OPTIONS, (v) => setStyle({ weekday: v }), {
    ...DATE_ROW,
    ariaLabel: 'Weekday format',
    reveal: showsWeekday(style.date_format),
  }),
  pickerRow('clock', 'Time', style.time_format, TIME_OPTIONS, (v) => setStyle({ time_format: v }), {
    ...DATE_ROW,
    ariaLabel: 'Time format',
  }),
]

const linkRows = (def: PropertyDefinition, { configure }: RowContext): MenuRow[] => [
  item('Underline', {
    kind: 'switch',
    checked: def.link_underline ?? false,
    onChange: (v) => configure({ link_underline: v }),
    ariaLabel: 'Underline links',
  }),
  colorItem(def.link_color, 'var(--link)', (next) => configure({ link_color: next })),
  pickerRow(
    undefined,
    styleLabel(def.type),
    def.link_display ?? DEFAULT_LINK_DISPLAY,
    LINK_DISPLAY_OPTIONS,
    (v: LinkDisplay) => configure({ link_display: v }),
    { ...ROW, ariaLabel: 'Link format' },
  ),
]

const checkboxRows = (
  def: PropertyDefinition,
  { style, setStyle, configure }: RowContext,
): MenuRow[] => [
  colorItem(def.checkbox_color, 'var(--checkbox-base)', (next) =>
    configure({ checkbox_color: next }),
  ),
  pickerRow(
    undefined,
    styleLabel(def.type),
    lookIn(LOOKS.checkbox, style.look),
    CHECKBOX_STYLE_OPTIONS,
    (look) => setStyle({ look }),
    { ...ROW, ariaLabel: 'Checkbox style' },
  ),
]

/** Relative to the asset root rather than to the nexus, so re-pointing the root carries it along; a refused choice offers the folder picker again. */
const fileRows = (def: PropertyDefinition, { configure, assetRoot }: RowContext): MenuRow[] => {
  const browse = (): void =>
    void dialer()
      .ask('assets:chooseDir', 'property', def.file_directory)
      .then((picked) => {
        if (reportRefusal(picked, browse) && picked.value !== null)
          configure({ file_directory: picked.value })
      })
  return [
    item('Directory', {
      kind: 'field',
      children: (
        <PathField
          label="Directory"
          value={def.file_directory ?? ''}
          empty={assetRoot}
          onCommit={(dir) => configure({ file_directory: dir })}
          onBrowse={browse}
        />
      ),
    }),
  ]
}

const NONE = (): MenuRow[] => []

// One arm per property type, so a type added is a compile error here rather than a blank pane: the option types edit in the option list, and Text and a registry Context carry no settings.
const TYPE_ROWS: Record<PropertyType, (def: PropertyDefinition, ctx: RowContext) => MenuRow[]> = {
  number: numberRows,
  dateTime: dateRows,
  link: linkRows,
  checkbox: checkboxRows,
  file: fileRows,
  select: NONE,
  multiSelect: NONE,
  status: NONE,
  text: NONE,
  context: NONE,
}

export const rowsFor = (def: PropertyDefinition, ctx: RowContext): MenuRow[] =>
  TYPE_ROWS[def.type](def, ctx)
