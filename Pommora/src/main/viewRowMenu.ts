import type { BrowserWindow } from 'electron'
import type { ViewRowMenuAction } from '@shared/viewMenus'
import { popReturningMenu } from './returningMenu'

/** The per-view right-click menu (ViewPane rows + embed segments). Delete disables on a
 *  container's only view (the deleteView handler refuses the last one; the menu mirrors the rule). */
export function popViewRowMenu(
  win: BrowserWindow,
  opts: { canDelete: boolean; labeled?: boolean },
): Promise<ViewRowMenuAction | null> {
  return popReturningMenu<ViewRowMenuAction>(win, (pick) => [
    { label: 'Rename', click: pick('view:rename') },
    { label: 'Edit Icon', click: pick('view:edit-icon') },
    { label: 'Edit Color', click: pick('view:change-color') },
    // Segment hosts pass their labeled state and get the toggle; surfaces without one (the
    // ViewPane's rows) never show it.
    ...(opts.labeled === undefined
      ? []
      : [{ label: opts.labeled ? 'Hide Titles' : 'Show Titles', click: pick('view:toggle-titles') }]),
    { type: 'separator' },
    { label: 'Delete', enabled: opts.canDelete, click: pick('view:delete') },
  ])
}
