import type { MenuItemConstructorOptions } from 'electron'
import type { StyleMenuItem } from '@pommora/core/Actions/columnMenu'
import { COLUMN_ALIGNS, type ColumnAlign } from '@pommora/core/Views/views'

type StyleAction = `style:${string}:${string}`

export function alignSubmenu(
  current: ColumnAlign | null | undefined,
  pick: (a: `align:${ColumnAlign}`) => () => void,
): MenuItemConstructorOptions[] {
  return COLUMN_ALIGNS.map((a) => ({
    label: `${a[0].toUpperCase()}${a.slice(1)}`,
    type: 'radio' as const,
    checked: current === a,
    click: pick(`align:${a}`),
  }))
}

/** Electron scopes radio groups per separator run, so `separatorBefore` keeps the date and time radios independent. */
export function styleSubmenu(
  rows: StyleMenuItem[],
  pick: (a: StyleAction) => () => void,
): MenuItemConstructorOptions[] {
  return rows.flatMap((r): MenuItemConstructorOptions[] => [
    ...(r.separatorBefore ? [{ type: 'separator' } as MenuItemConstructorOptions] : []),
    { label: r.label, type: 'radio', checked: r.checked, click: pick(`style:${r.key}:${r.value}`) },
  ])
}
