import type { BrowserWindow } from 'electron'
import {
  type ViewRowAction,
  type ViewRowMenuContext,
  viewRowMenuItems,
} from '@pommora/core/Actions/viewRowMenu'
import { popModelMenu } from './rowMenu'

export function popViewRowMenu(
  win: BrowserWindow,
  ctx: ViewRowMenuContext,
): Promise<ViewRowAction | null> {
  return popModelMenu<ViewRowAction>(win, viewRowMenuItems(ctx))
}
