import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  styleMenuItems,
  styleMenuLabel,
  type ColumnMenuAction,
  type ColumnMenuContext,
} from '@shared/columnMenu'
import { popReturningMenu } from './returningMenu'
import { alignSubmenu, styleSubmenu } from './styleMenu'

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
    items.push({
      label: 'Icon',
      type: 'checkbox',
      checked: ctx.iconsShown,
      click: pick('column:toggle-icons'),
    })
    if (ctx.hideable) {
      items.push({ type: 'separator' }, { label: 'Hide', click: pick('column:hide') })
    }
    return items
  })
}
