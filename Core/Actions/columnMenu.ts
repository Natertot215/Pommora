import {
  COLUMN_LOOKS,
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  TIME_FORMATS,
  WEEKDAY_FORMATS,
  type ColumnStyle,
} from '../Properties/columnStyles'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS, type PropertyType } from '../Properties/properties'
import type { ColumnAlign } from '../Views/views'

export type ColumnMenuAction =
  | 'column:hide'
  | 'column:toggle-icons'
  | `align:${ColumnAlign}`
  | `style:${string}:${string}`

export interface ColumnMenuContext {
  align: ColumnAlign
  alignable: boolean
  hideable: boolean
  iconsShown: boolean
  style?: StyleMenuContext
}

/** `current` is the RESOLVED style (defaults applied), so the checked radio reflects what renders. */
export interface StyleMenuContext {
  type: PropertyType
  current: ColumnStyle
  barCapable?: boolean
}

/** A url's three link forms and a number's are formats; the rest offer looks, a different word. */
export function styleMenuLabel(type: PropertyType): string {
  return type === 'url' || type === 'number' ? 'Format' : 'Style'
}

/** `separatorBefore` splits the datetime date radios from its time radios: Electron groups radios per separator-bounded run. */
export interface StyleMenuItem {
  label: string
  key: keyof ColumnStyle & string
  value: string
  checked: boolean
  separatorBefore?: boolean
}

/** The ONE place that knows which types are style-addressable; datetime labels are format NAMES, never samples. */
export function styleMenuItems(ctx: StyleMenuContext): StyleMenuItem[] {
  const { type, current } = ctx
  const row =
    (key: StyleMenuItem['key'], checked: string | undefined) =>
    (label: string, value: string, separatorBefore?: boolean): StyleMenuItem => ({
      label,
      key,
      value,
      checked: checked === value,
      ...(separatorBefore ? { separatorBefore } : {}),
    })
  const look = row('look', current.look)
  switch (type) {
    case 'status':
    case 'select':
    case 'multi_select':
      return [look('Standard', 'standard'), look('Compact', 'compact')]
    case 'checkbox':
      return [look('Checkbox', 'checkbox'), look('Switch', 'switch')]
    case 'url':
      return LINK_DISPLAYS.map((d) => look(LINK_DISPLAY_LABELS[d], d))
    case 'number':
      return ctx.barCapable
        ? [look('Number', 'number'), look('Bar', 'bar')]
        : [look('Number', 'number')]
    case 'datetime':
    case 'created_time':
    case 'last_edited_time': {
      const date = row('date_format', current.date_format)
      const weekday = row('weekday', current.weekday)
      const time = row('time_format', current.time_format)
      return [
        ...DATE_FORMATS.map((f) => date(DATE_FORMAT_LABELS[f], f)),
        weekday('Full', 'long', true),
        weekday('Short', 'short'),
        weekday('Hidden', 'none'),
        time('12 Hours', 'twelveHour', true),
        time('24 Hours', 'twentyFourHour'),
        time('Hidden', 'none'),
      ]
    }
    default:
      return []
  }
}

const STYLE_VALUES: Record<string, readonly string[]> = {
  look: COLUMN_LOOKS,
  date_format: DATE_FORMATS,
  time_format: TIME_FORMATS,
  weekday: WEEKDAY_FORMATS,
}

export function parseStyleAction(
  action: string,
): { key: keyof ColumnStyle & string; value: string } | null {
  const m = /^style:([^:]+):(.+)$/.exec(action)
  if (!m) return null
  const [, key, value] = m
  return STYLE_VALUES[key]?.includes(value)
    ? { key: key as keyof ColumnStyle & string, value }
    : null
}
