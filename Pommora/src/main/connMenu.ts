import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ConnMenuAction, ConnMenuContext } from '@shared/connections'
import { PAGE_CLIPBOARD_ACTIONS, pageMetaMenuSubset } from '@shared/pageMenu'
import { pageMenuTemplate } from './pageMenu'
import { popReturningMenu } from './returningMenu'

// The link right-click menu — popCellMenu's shape: main pops at the cursor, resolves the chosen
// action; resolve(null) covers a dismissed menu so the renderer no-ops. The authoring pair is built
// only for a surface that can take the edit, rather than shown and refused. A web address reaches no
// page, so it keeps only the item that copies the address itself.
export function popConnMenu(
  win: BrowserWindow,
  ctx: ConnMenuContext,
): Promise<ConnMenuAction | null> {
  return popReturningMenu<ConnMenuAction>(win, (pick) => {
    if (ctx.external) return pageMenuTemplate(pageMetaMenuSubset(['title:copylink']), pick)
    const items: MenuItemConstructorOptions[] = [{ label: 'Open Preview', click: pick('preview') }]
    if (ctx.editable)
      items.push(
        { type: 'separator' },
        // Naming the act rather than the item: on a bare link there is no title yet to rename.
        { label: ctx.hasAlias ? 'Rename' : 'Add Title', click: pick('rename') },
        { label: 'Edit Link', click: pick('editLink') },
      )
    items.push(
      { type: 'separator' },
      ...pageMenuTemplate(pageMetaMenuSubset(PAGE_CLIPBOARD_ACTIONS), pick),
    )
    return items
  })
}
