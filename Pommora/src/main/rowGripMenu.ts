import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  type RowGripMenuAction,
  type RowGripMenuContext,
  rowGripMenuModel,
} from '@shared/rowGripMenu'

// The table row grip's right-click menu, popped over the shared model. resolve(null) covers a
// dismissed menu so the renderer no-ops.
export function popRowGripMenu(
  win: BrowserWindow,
  ctx: RowGripMenuContext,
): Promise<RowGripMenuAction | null> {
  return new Promise<RowGripMenuAction | null>((resolve) => {
    let acted = false
    const items: MenuItemConstructorOptions[] = []
    for (const it of rowGripMenuModel(ctx).items) {
      if (it.separatorBefore) items.push({ type: 'separator' })
      items.push({
        label: it.label,
        click: () => {
          acted = true
          resolve(it.action)
        },
      })
    }
    Menu.buildFromTemplate(items).popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}
