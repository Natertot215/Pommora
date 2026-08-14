import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { TabMenuAction, TabMenuContext } from '@shared/tabMenu'
import { pageMetaMenuSubset, pageSendActions } from '@shared/pageMenu'
import { pageMenuTemplate } from './pageMenu'
import { popReturningMenu } from './returningMenu'

// The tab right-click menu: Open Preview · the send block · Pin/Unpin · Close, gated by the tab's
// state. The send items come from the shared page-menu model, so a tab holding a page names them
// exactly as every other surface that reaches one does.
export function popTabMenu(win: BrowserWindow, ctx: TabMenuContext): Promise<TabMenuAction | null> {
  return popReturningMenu<TabMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    // A page in a tab can still be opened in the floating preview — the same reach its row has
    // in the sidebar, so being open somewhere doesn't cost you the gesture.
    if (ctx.isPage)
      items.push(
        { label: 'Open Preview', click: pick('preview') },
        { type: 'separator' },
        ...pageMenuTemplate(
          pageMetaMenuSubset(pageSendActions(ctx)),
          pick,
          ctx,
        ),
        { type: 'separator' },
      )
    if (!ctx.isNewTab)
      items.push({ label: ctx.pinned ? 'Unpin' : 'Pin', click: pick(ctx.pinned ? 'unpin' : 'pin') })
    if (!ctx.pinned) {
      if (items.length > 0) items.push({ type: 'separator' })
      items.push({ label: 'Close', click: pick('close') })
    }
    return items
  })
}
