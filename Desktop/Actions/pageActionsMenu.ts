import type { BrowserWindow } from 'electron'
import { type PageMetaAction, pageMetaMenuSubset } from '@pommora/core/Actions/pageMenu'
import { popModelMenu } from './rowMenu'

export function popPageActionsMenu(
  win: BrowserWindow,
  ctx: { actions: PageMetaAction[]; alreadyOpen?: boolean },
): Promise<PageMetaAction | null> {
  return popModelMenu(win, pageMetaMenuSubset(ctx.actions, ctx.alreadyOpen))
}
