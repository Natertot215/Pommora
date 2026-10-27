import { capitalize } from '@pommora/uix/Utilities/capitalize'
import {
  COLUMN_LOOKS,
  DATE_FORMATS,
  LOOKS,
  showsWeekday,
  TIME_FORMATS,
  WEEKDAY_FORMATS,
  type ColumnLook,
  type ColumnStyle,
} from '../Properties/columnStyles'
import {
  DATE_FORMAT_LABELS,
  LOOK_LABELS,
  TIME_FORMAT_LABELS,
  WEEKDAY_FORMAT_LABELS,
} from '../Properties/displayLabels'
import { type ColumnType, PROPERTY_TYPES } from '../Properties/properties'
import { styleLabel } from '../Properties/typeDisplay'
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
  type: ColumnType
  current: ColumnStyle
  barCapable?: boolean
}

export function alignRows(
  current: ColumnAlign | null | undefined,
): ActionItem<`align:${ColumnAlign}`>[] {
  return COLUMN_ALIGNS.map((a) => ({
    label: capitalize(a),
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
  if (PROPERTY_TYPES[type].kind === 'dateTime') {
    const date = row('date_format', current.date_format)
    const weekday = row('weekday', current.weekday)
    const time = row('time_format', current.time_format)
    return [
      ...DATE_FORMATS.map((f) => date(DATE_FORMAT_LABELS[f], f)),
      ...(showsWeekday(current.date_format)
        ? [
            ...WEEKDAY_FORMATS.filter((w) => w !== 'none').map((w, i) =>
              weekday(WEEKDAY_FORMAT_LABELS[w], w, i === 0),
            ),
            current.weekday === 'none' ? weekday('Show Day', 'long') : weekday('Hide Day', 'none'),
          ]
        : []),
      ...TIME_FORMATS.filter((t) => t !== 'none').map((t, i) =>
        time(TIME_FORMAT_LABELS[t], t, i === 0),
      ),
      current.time_format === 'none' ? time('Show Time', 'shown') : time('Hide Time', 'none'),
    ]
  }
  const look = row('look', current.look)
  const looks: readonly ColumnLook[] = LOOKS[type]
  return looks.filter((l) => ctx.barCapable || l !== 'bar').map((l) => look(LOOK_LABELS[l], l))
}

/** Offered only where there's a choice to make: a lone row would only restate what renders. */
export function styleBranch(ctx: StyleMenuContext): ActionItem<StyleAction>[] {
  const submenu = styleMenuItems(ctx)
  return submenu.length > 1 ? [{ label: styleLabel(ctx.type), submenu }] : []
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
  time_format: [...TIME_FORMATS, 'shown'],
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
