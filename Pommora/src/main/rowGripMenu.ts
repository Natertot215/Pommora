import type { BrowserWindow } from 'electron'
import {
  type RowGripMenuAction,
  type RowGripMenuContext,
  rowGripMenuModel,
} from '@shared/rowGripMenu'
import { popModelMenu } from './returningMenu'

// The table row grip's right-click menu, popped over the shared model.
export function popRowGripMenu(
  win: BrowserWindow,
  ctx: RowGripMenuContext,
): Promise<RowGripMenuAction | null> {
  return popModelMenu(win, rowGripMenuModel(ctx).items)
}
