import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { TabMenuAction, TabMenuContext } from '@shared/tabMenu'
import { pageMetaMenuSubset, pageSendActions } from '@shared/pageMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'
import { pinLabel } from '@shared/toggleLabels'

// The tab right-click menu: Open Preview · the send block · Pin/Unpin · Close, gated by the
// tab's state. The send items come from the shared page-menu model.
export function popTabMenu(win: BrowserWindow, ctx: TabMenuContext): Promise<TabMenuAction | null> {
  return popReturningMenu<TabMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    // A page in a tab can still be opened in the Page Window — the same reach its row has
    // in the sidebar, so being open somewhere doesn't cost you the gesture.
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
