import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { TabMenuAction, TabMenuContext } from '@pommora/core/Actions/tabMenu'
import { pageMetaMenuSubset, pageSendActions } from '@pommora/core/Actions/pageMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'
import { pinLabel } from '@pommora/core/Actions/toggleLabels'

export function popTabMenu(win: BrowserWindow, ctx: TabMenuContext): Promise<TabMenuAction | null> {
  return popReturningMenu<TabMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    // Being open in a tab doesn't cost the Page Window gesture its row has in the sidebar.
    if (ctx.isPage)
      items.push(
        { label: 'Open Preview', click: pick('window') },
        { type: 'separator' },
        ...rowTemplate(pageMetaMenuSubset(pageSendActions(ctx)), pick, ctx),
        { type: 'separator' },
      )
    if (!ctx.isNewTab)
      items.push({ label: pinLabel(ctx.pinned), click: pick(ctx.pinned ? 'unpin' : 'pin') })
    if (!ctx.pinned) {
      if (items.length > 0) items.push({ type: 'separator' })
      items.push({ label: 'Close', click: pick('close') })
    }
    return items
  })
}
