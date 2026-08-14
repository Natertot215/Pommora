import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { cellMenuModel, type CellMenuAction, type CellMenuContext } from '@shared/cellMenu'
import { pageMenuTemplate } from './pageMenu'
import { styleSubmenu } from './styleMenu'

// The table-cell right-click menu — popColumnMenu's shape over the shared cellMenuModel:
// a Style ▸ submenu (per-type radios) ahead of the plain items (title meta / Edit).
// resolve(null) covers a dismissed menu so the renderer no-ops.
export function popCellMenu(
  win: BrowserWindow,
  ctx: CellMenuContext,
): Promise<CellMenuAction | null> {
  return new Promise<CellMenuAction | null>((resolve) => {
    let acted = false
    const pick = (a: CellMenuAction) => (): void => {
      acted = true
      resolve(a)
    }
    const model = cellMenuModel(ctx)
    const items: MenuItemConstructorOptions[] = []
    if (model.style && model.style.length > 0) {
      items.push({ label: 'Style', submenu: styleSubmenu(model.style, pick) })
    }
    if (items.length > 0 && model.items.length > 0) items.push({ type: 'separator' })
    items.push(...pageMenuTemplate(model.items, pick, ctx.kind === 'title' ? ctx : undefined))
    if (items.length === 0) {
      resolve(null)
      return
    }
    const menu = Menu.buildFromTemplate(items)
    menu.popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}
