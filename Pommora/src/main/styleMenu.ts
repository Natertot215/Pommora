import type { MenuItemConstructorOptions } from 'electron'
import type { StyleMenuItem } from '@shared/columnMenu'
import { COLUMN_ALIGNS, type ColumnAlign } from '@shared/views'

type StyleAction = `style:${string}:${string}`

/** The Align submenu shared by the view column header and the markdown table's column grip — one
 *  radio per alignment, the current one checked. */
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

/** The Style submenu template shared by the column-header and cell menus: each row is a radio, and a
 *  `separatorBefore` row is preceded by a separator (Electron scopes radio groups per separator run,
 *  so the datetime menu's date/time radios check independently). */
export function styleSubmenu(
  rows: StyleMenuItem[],
  pick: (a: StyleAction) => () => void,
): MenuItemConstructorOptions[] {
  return rows.flatMap((r): MenuItemConstructorOptions[] => [
    ...(r.separatorBefore ? [{ type: 'separator' } as MenuItemConstructorOptions] : []),
    { label: r.label, type: 'radio', checked: r.checked, click: pick(`style:${r.key}:${r.value}`) },
  ])
}
