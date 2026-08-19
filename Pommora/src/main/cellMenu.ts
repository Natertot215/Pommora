import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { cellMenuModel, type CellMenuAction, type CellMenuContext } from '@shared/cellMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'
import { styleSubmenu } from './styleMenu'

// The table-cell right-click menu — the type's own submenu (per-type radios, named by the model)
// ahead of the plain items (title meta / Edit).
export function popCellMenu(
  win: BrowserWindow,
  ctx: CellMenuContext,
): Promise<CellMenuAction | null> {
  const model = cellMenuModel(ctx)
  return popReturningMenu<CellMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (model.style && model.style.rows.length > 0) {
      items.push({ label: model.style.label, submenu: styleSubmenu(model.style.rows, pick) })
    }
    if (items.length > 0 && model.items.length > 0) items.push({ type: 'separator' })
    items.push(...rowTemplate(model.items, pick, ctx.kind === 'title' ? ctx : undefined))
    return items
  })
}
