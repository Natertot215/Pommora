import type { BrowserWindow } from 'electron'
import { type PageMetaAction, pageMetaMenuSubset } from '@shared/pageMenu'
import { popModelMenu } from './returningMenu'

// A named subset of the page menu, popped where a surface wants a few of its actions rather than
// all of them — the settings pane's ellipsis. The labels and their order still come from the one
// page-menu model.
export function popPageActionsMenu(
  win: BrowserWindow,
  ctx: { actions: PageMetaAction[]; alreadyOpen?: boolean },
): Promise<PageMetaAction | null> {
  return popModelMenu(win, pageMetaMenuSubset(ctx.actions, ctx.alreadyOpen))
}
