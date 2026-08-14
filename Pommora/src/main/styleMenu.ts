import type { MenuItemConstructorOptions } from 'electron'
import type { StyleMenuItem } from '@shared/columnMenu'
import type { ViewStyle } from '@shared/types'
import { COLUMN_ALIGNS, type ColumnAlign } from '@shared/views'
import type { ViewStyleAction } from '@shared/viewMenus'

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

/** The Style submenu shared by the toolbar's view button and the view embed — which surface a
 *  container's views are picked from. Checkboxes rather than radios: the pair reads as two states
 *  of one setting, and Electron scopes a radio group to its separator run. */
export function viewStyleSubmenu(
  current: ViewStyle,
  pick: (a: ViewStyleAction) => () => void,
): MenuItemConstructorOptions[] {
  const row = (label: string, style: ViewStyle): MenuItemConstructorOptions => ({
    label,
    type: 'checkbox',
    checked: current === style,
    click: pick(`style-${style}`),
  })
  return [row('Dropdown', 'dropdown'), row('Toolbar', 'toolbar')]
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
