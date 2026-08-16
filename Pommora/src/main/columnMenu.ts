import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  styleMenuItems,
  styleMenuLabel,
  type ColumnMenuAction,
  type ColumnMenuContext,
} from '@shared/columnMenu'
import { popReturningMenu } from './returningMenu'
import { alignSubmenu, styleSubmenu } from './styleMenu'

// The table-view column header's right-click menu — Align (a radio L/C/R, current checked) + the
// type's own submenu (per-type radios from the shared builder, named by it) + Hide; the Title column carries none, and an empty
// menu is a dismissal.
export function popColumnMenu(
  win: BrowserWindow,
  ctx: ColumnMenuContext,
): Promise<ColumnMenuAction | null> {
  return popReturningMenu<ColumnMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (ctx.alignable) items.push({ label: 'Align', submenu: alignSubmenu(ctx.align, pick) })
    const styleRows = ctx.style ? styleMenuItems(ctx.style) : []
    if (ctx.style && styleRows.length > 0) {
      items.push({
        label: styleMenuLabel(ctx.style.type),
        submenu: styleSubmenu(styleRows, pick),
      })
    }
    if (ctx.iconsShown !== undefined) {
      items.push({
        label: 'Icon',
        type: 'checkbox',
        checked: ctx.iconsShown,
        click: pick('column:toggle-icons'),
      })
    }
    const hasTop = ctx.alignable || styleRows.length > 0 || ctx.iconsShown !== undefined
    if (hasTop && ctx.hideable) items.push({ type: 'separator' })
    if (ctx.hideable) items.push({ label: 'Hide', click: pick('column:hide') })
    return items
  })
}
