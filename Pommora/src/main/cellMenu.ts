import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { cellMenuModel, type CellMenuAction, type CellMenuContext } from '@shared/cellMenu'
import { pageMenuTemplate } from './pageMenu'
import { popReturningMenu } from './returningMenu'
import { styleSubmenu } from './styleMenu'

// The table-cell right-click menu — a Style ▸ submenu (per-type radios) ahead of the plain items
// (title meta / Edit).
export function popCellMenu(
  win: BrowserWindow,
  ctx: CellMenuContext,
): Promise<CellMenuAction | null> {
  const model = cellMenuModel(ctx)
  return popReturningMenu<CellMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (model.style && model.style.length > 0) {
      items.push({ label: 'Style', submenu: styleSubmenu(model.style, pick) })
    }
    if (items.length > 0 && model.items.length > 0) items.push({ type: 'separator' })
    items.push(...pageMenuTemplate(model.items, pick, ctx.kind === 'title' ? ctx : undefined))
    return items
  })
}
