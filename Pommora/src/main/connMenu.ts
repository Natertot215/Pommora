import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ConnMenuAction, ConnMenuContext } from '@shared/connections'

// The wikilink right-click menu — popCellMenu's shape: main pops at the cursor, resolves the chosen
// action; resolve(null) covers a dismissed menu so the renderer no-ops. The authoring pair is built
// only for a surface that can take the edit, rather than shown and refused.
export function popConnMenu(
  win: BrowserWindow,
  ctx: ConnMenuContext,
): Promise<ConnMenuAction | null> {
  return new Promise<ConnMenuAction | null>((resolve) => {
    let acted = false
    const pick = (a: ConnMenuAction) => (): void => {
      acted = true
      resolve(a)
    }
    const items: MenuItemConstructorOptions[] = [
      { label: 'Open Preview', click: pick('preview') },
    ]
    if (ctx.editable)
      items.push(
        { type: 'separator' },
        // Naming the act rather than the item: on a bare link there is no title yet to rename.
        { label: ctx.hasAlias ? 'Rename' : 'Add Title', click: pick('rename') },
        { label: 'Edit Link', click: pick('editLink') },
      )
    Menu.buildFromTemplate(items).popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}
