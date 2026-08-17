// The table row grip's right-click menu — the full page-meta block with the preview and
// New Page items requested. Its own channel: the block grip's `grip-menu` belongs to the
// editor and stays untouched.

import {
  type PageMetaAction,
  type PageMoveAction,
  type PageMoveContext,
  offersMove,
  pageMetaMenuItems,
} from './pageMenu'
import type { ActionItem } from './menuModel'

export type RowGripMenuAction = PageMetaAction | PageMoveAction

export interface RowGripMenuContext extends PageMoveContext {
  alreadyOpen?: boolean
}

export function rowGripMenuModel(ctx: RowGripMenuContext): {
  items: ActionItem<RowGripMenuAction>[]
} {
  return {
    items: pageMetaMenuItems(ctx.alreadyOpen, {
      preview: true,
      newPages: 'pair',
      move: offersMove(ctx),
      clipboard: true,
    }),
  }
}
