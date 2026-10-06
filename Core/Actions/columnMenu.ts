import {
  CHECKBOX_LOOKS,
  COLUMN_LOOKS,
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  LOOK_LABELS,
  NUMBER_LOOKS,
  OPTION_LOOKS,
  showsWeekday,
  TIME_FORMAT_LABELS,
  TIME_FORMATS,
  WEEKDAY_FORMAT_LABELS,
  WEEKDAY_FORMATS,
  type ColumnStyle,
} from '../Properties/columnStyles'
import { LINK_DISPLAYS, PROPERTY_TYPES, type PropertyType } from '../Properties/properties'
import { COLUMN_ALIGNS, type ColumnAlign } from '../Views/views'
import type { ActionItem } from './menuModel'

export type StyleAction = `style:${string}:${string}`

type ColumnMenuAction = 'column:hide' | 'column:toggle-icons' | `align:${ColumnAlign}` | StyleAction

interface ColumnMenuContext {
  align: ColumnAlign
  alignable: boolean
  hideable: boolean
  iconsShown: boolean
  style?: StyleMenuContext
}

/** `current` is the RESOLVED style (defaults applied), so the checked row reflects what renders. */
export interface StyleMenuContext {
  type: PropertyType
  current: ColumnStyle
  barCapable?: boolean
}

function styleMenuLabel(type: PropertyType): string {
  return type === 'link' || type === 'number' ? 'Format' : 'Style'
}

export function alignRows(
  current: ColumnAlign | null | undefined,
): ActionItem<`align:${ColumnAlign}`>[] {
  return COLUMN_ALIGNS.map((a) => ({
    label: `${a[0].toUpperCase()}${a.slice(1)}`,
    action: `align:${a}`,
    checked: current === a,
  }))
}

export function styleMenuItems(ctx: StyleMenuContext): ActionItem<StyleAction>[] {
  const { type, current } = ctx
  const row =
    (key: keyof ColumnStyle & string, checked: string | undefined) =>
    (label: string, value: string, separatorBefore?: boolean): ActionItem<StyleAction> => ({
      label,
      action: `style:${key}:${value}`,
      checked: checked === value,
      ...(separatorBefore ? { separatorBefore } : {}),
    })
  const look = row('look', current.look)
  switch (PROPERTY_TYPES[type].kind) {
    case 'select':
    case 'multiSelect':
      return OPTION_LOOKS.map((l) => look(LOOK_LABELS[l], l))
    case 'checkbox':
      return CHECKBOX_LOOKS.map((l) => look(LOOK_LABELS[l], l))
    case 'link':
      return LINK_DISPLAYS.map((l) => look(LOOK_LABELS[l], l))
    case 'number':
      return NUMBER_LOOKS.filter((l) => ctx.barCapable || l !== 'bar').map((l) =>
        look(LOOK_LABELS[l], l),
      )
    case 'dateTime': {
      const date = row('date_format', current.date_format)
      const weekday = row('weekday', current.weekday)
      const time = row('time_format', current.time_format)
      return [
        ...DATE_FORMATS.map((f) => date(DATE_FORMAT_LABELS[f], f)),
        ...(showsWeekday(current.date_format)
          ? WEEKDAY_FORMATS.map((w, i) => weekday(WEEKDAY_FORMAT_LABELS[w], w, i === 0))
          : []),
        ...TIME_FORMATS.map((t, i) => time(TIME_FORMAT_LABELS[t], t, i === 0)),
      ]
    }
    case 'context':
    case 'file':
      return []
  }
}

export function styleBranch(ctx: StyleMenuContext): ActionItem<StyleAction>[] {
  const submenu = styleMenuItems(ctx)
  return submenu.length > 0 ? [{ label: styleMenuLabel(ctx.type), submenu }] : []
}

export function columnMenuItems(ctx: ColumnMenuContext): ActionItem<ColumnMenuAction>[] {
  return [
    ...(ctx.alignable ? [{ label: 'Align', submenu: alignRows(ctx.align) }] : []),
    ...(ctx.style ? styleBranch(ctx.style) : []),
    { label: 'Icon', action: 'column:toggle-icons', checked: ctx.iconsShown },
    ...(ctx.hideable
      ? [{ label: 'Hide', action: 'column:hide' as const, separatorBefore: true }]
      : []),
  ]
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
