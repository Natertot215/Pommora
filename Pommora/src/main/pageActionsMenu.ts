import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { type PageMetaAction, pageMetaMenuSubset } from '@shared/pageMenu'

// A named subset of the page menu, popped where a surface wants a few of its actions rather than
// all of them — the settings pane's ellipsis. The labels and their order still come from the one
// page-menu model. resolve(null) covers a dismissed menu so the renderer no-ops.
export function popPageActionsMenu(
  win: BrowserWindow,
  ctx: { actions: PageMetaAction[]; alreadyOpen?: boolean },
): Promise<PageMetaAction | null> {
  return new Promise<PageMetaAction | null>((resolve) => {
    let acted = false
    const items: MenuItemConstructorOptions[] = []
    for (const it of pageMetaMenuSubset(ctx.actions, ctx.alreadyOpen)) {
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
