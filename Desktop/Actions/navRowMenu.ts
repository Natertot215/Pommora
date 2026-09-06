import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { NavRowMenuAction, NavRowMenuContext } from '@pommora/core/Actions/navRowMenu'
import { pageMetaMenuSubset, pageSendActions } from '@pommora/core/Actions/pageMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'
import { favoriteLabel, openLabel, pinLabel } from '@pommora/core/Actions/toggleLabels'

export function popNavRowMenu(
  win: BrowserWindow,
  ctx: NavRowMenuContext,
): Promise<NavRowMenuAction | null> {
  return popReturningMenu<NavRowMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (ctx.canOpenNewTab)
      items.push({
        label: openLabel(ctx.alreadyOpen),
        click: pick('open-new-tab'),
      })
    if (ctx.isPage) items.push({ label: 'Open Preview', click: pick('open-window') })
    if (items.length > 0) items.push({ type: 'separator' })
    // A recent is a stored ref, addressable only once the renderer has minted a live path.
    if (ctx.isPage && ctx.currentParentPath !== undefined) {
      items.push(...rowTemplate(pageMetaMenuSubset(pageSendActions(ctx)), pick, ctx))
      items.push({ type: 'separator' })
    }
    items.push({
      label: pinLabel(ctx.isPinned),
      click: pick(ctx.isPinned ? 'unpin' : 'pin'),
    })
    items.push({
      label: favoriteLabel(ctx.isFavorite),
      click: pick(ctx.isFavorite ? 'unfavorite' : 'favorite'),
    })
    items.push({ type: 'separator' })
    items.push({ label: 'Remove', click: pick('remove') })
    return items
  })
}
