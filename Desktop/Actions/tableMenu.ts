import type { BrowserWindow } from 'electron'
import {
  type TableMenuAction,
  type TableMenuContext,
  tableMenuItems,
} from '@pommora/core/Actions/tableMenu'
import { popModelMenu } from './rowMenu'

export function popTableMenu(
  win: BrowserWindow,
  ctx: TableMenuContext,
): Promise<TableMenuAction | null> {
  return popModelMenu<TableMenuAction>(win, tableMenuItems(ctx))
}
