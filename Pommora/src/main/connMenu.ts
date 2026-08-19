import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  CONN_OPEN_ACTIONS,
  CONN_UNLINK_ROWS,
  type ConnMenuAction,
  type ConnMenuContext,
} from '@shared/connections'
import { PAGE_CLIPBOARD_ACTIONS, pageMetaMenuSubset } from '@shared/pageMenu'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS } from '@shared/properties'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'

// The link right-click menu — popCellMenu's shape: main pops at the cursor, resolves the chosen
// action; resolve(null) covers a dismissed menu so the renderer no-ops. The authoring items are
// built only for a surface that can take the edit, rather than shown and refused.
//
// A web address reaches no page, so nothing that needs one is offered; what it gets instead is the
// items that edit the link itself — its two halves first, then the address on the clipboard, then how
// it reads and whether it stays a link at all. Format carries no radio state because there is none to
// carry: the label is ordinary text, and a link written in one form is indistinguishable from the
// same words typed by hand.
export function popConnMenu(
  win: BrowserWindow,
  ctx: ConnMenuContext,
): Promise<ConnMenuAction | null> {
  return popReturningMenu<ConnMenuAction>(win, (pick) => {
    if (ctx.external)
      return [
        ...(ctx.editable
          ? [
              { label: 'Rename', click: pick('rename') },
              { label: 'Edit Link', click: pick('editLink') },
            ]
          : []),
        ...rowTemplate(pageMetaMenuSubset(['title:copylink']), pick),
        ...(ctx.editable
          ? [
              {
                label: 'Format',
                submenu: LINK_DISPLAYS.map((d) => ({
                  label: LINK_DISPLAY_LABELS[d],
                  click: pick(`format:${d}`),
                })),
              },
              ...rowTemplate(CONN_UNLINK_ROWS, pick),
            ]
          : []),
      ]
    const items: MenuItemConstructorOptions[] = rowTemplate(
      pageMetaMenuSubset(CONN_OPEN_ACTIONS, ctx.alreadyOpen),
      pick,
    )
    if (ctx.editable)
      items.push(
        { type: 'separator' },
        // Naming the act rather than the item: on a bare link there is no title yet to rename.
        { label: ctx.hasAlias ? 'Rename' : 'Add Title', click: pick('rename') },
        { label: 'Edit Link', click: pick('editLink') },
      )
    items.push(
      { type: 'separator' },
      ...rowTemplate(pageMetaMenuSubset(PAGE_CLIPBOARD_ACTIONS), pick),
    )
    return items
  })
}
