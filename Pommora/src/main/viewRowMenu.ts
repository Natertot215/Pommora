import type { BrowserWindow } from 'electron'
import { type ViewRowAction, type ViewRowMenuContext, viewRowMenuItems } from '@shared/viewRowMenu'
import { popModelMenu } from './rowMenu'

/** A saved view row's right-click menu — the model's rows, nothing else. */
export function popViewRowMenu(
  win: BrowserWindow,
  ctx: ViewRowMenuContext,
): Promise<ViewRowAction | null> {
  return popModelMenu<ViewRowAction>(win, viewRowMenuItems(ctx))
}
