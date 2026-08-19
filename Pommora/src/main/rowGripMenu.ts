import type { BrowserWindow } from 'electron'
import {
  type RowGripMenuAction,
  type RowGripMenuContext,
  rowGripMenuModel,
} from '@shared/rowGripMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'

// The table row grip's right-click menu, popped over the shared model.
export function popRowGripMenu(
  win: BrowserWindow,
  ctx: RowGripMenuContext,
): Promise<RowGripMenuAction | null> {
  const model = rowGripMenuModel(ctx)
  return popReturningMenu<RowGripMenuAction>(win, (pick) => rowTemplate(model.items, pick, ctx))
}
