import type { BrowserWindow } from 'electron'
import { type TableMenuAction, type TableMenuContext, tableMenuItems } from '@shared/tableMenu'
import { popModelMenu } from './rowMenu'

/** The markdown table grip's right-click menu — the model's rows, nothing else. */
export function popTableMenu(
  win: BrowserWindow,
  ctx: TableMenuContext,
): Promise<TableMenuAction | null> {
  return popModelMenu<TableMenuAction>(win, tableMenuItems(ctx))
}
