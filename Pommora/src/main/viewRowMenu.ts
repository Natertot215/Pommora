import type { BrowserWindow } from 'electron'
import type { ViewRowMenuAction } from '@shared/viewMenus'
import { popReturningMenu } from './returningMenu'

/** A ViewPane view row's right-click menu — Rename / Edit Icon / Delete. Delete disables on a
 *  container's only view (the deleteView handler refuses the last one; the menu mirrors the rule). */
export function popViewRowMenu(
  win: BrowserWindow,
  opts: { canDelete: boolean },
): Promise<ViewRowMenuAction | null> {
  return popReturningMenu<ViewRowMenuAction>(win, (pick) => [
    { label: 'Rename', click: pick('view:rename') },
    { label: 'Edit Icon', click: pick('view:edit-icon') },
    { type: 'separator' },
    { label: 'Delete', enabled: opts.canDelete, click: pick('view:delete') },
  ])
}
