import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { NavRowMenuAction, NavRowMenuContext } from '@shared/navRowMenu'
import { pageMetaMenuSubset, pageSendActions } from '@shared/pageMenu'
import { pageMenuTemplate } from './pageMenu'
import { popReturningMenu } from './returningMenu'

// The NavWindow row/card menu: Open · Open Preview · the send block a page carries · Pin/Unpin ·
// Favorite/Unfavorite · Remove, gated by the row's live state.
export function popNavRowMenu(
  win: BrowserWindow,
  ctx: NavRowMenuContext,
): Promise<NavRowMenuAction | null> {
  return popReturningMenu<NavRowMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (ctx.canOpenNewTab)
      items.push({
        label: ctx.alreadyOpen ? 'Open' : 'Open New Tab',
        click: pick('open-new-tab'),
      })
    if (ctx.isPage) items.push({ label: 'Open Preview', click: pick('open-preview') })
    if (items.length > 0) items.push({ type: 'separator' })
    // A recent is a stored ref, so its page is addressable only once the renderer has minted a live
    // path against the tree — without one, none of the three actions has anything to act on.
    if (ctx.isPage && ctx.currentParentPath !== undefined) {
      items.push(...pageMenuTemplate(pageMetaMenuSubset(pageSendActions(ctx)), pick, ctx))
      items.push({ type: 'separator' })
    }
    items.push({
      label: ctx.isPinned ? 'Unpin' : 'Pin',
      click: pick(ctx.isPinned ? 'unpin' : 'pin'),
    })
    items.push({
      label: ctx.isFavorite ? 'Unfavorite' : 'Favorite',
      click: pick(ctx.isFavorite ? 'unfavorite' : 'favorite'),
    })
    items.push({ type: 'separator' })
    items.push({ label: 'Remove', click: pick('remove') })
    return items
  })
}
