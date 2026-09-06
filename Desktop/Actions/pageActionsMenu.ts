import type { BrowserWindow } from 'electron'
import { type PageMetaAction, pageMetaMenuSubset } from '@pommora/core/Actions/pageMenu'
import { popModelMenu } from './rowMenu'

// A named subset of the page menu, for a surface wanting a few of its actions rather than all.
export function popPageActionsMenu(
  win: BrowserWindow,
  ctx: { actions: PageMetaAction[]; alreadyOpen?: boolean },
): Promise<PageMetaAction | null> {
  return popModelMenu(win, pageMetaMenuSubset(ctx.actions, ctx.alreadyOpen))
}
