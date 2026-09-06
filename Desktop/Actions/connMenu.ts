import type { BrowserWindow } from 'electron'
import {
  connMenuModel,
  type ConnMenuAction,
  type ConnMenuContext,
} from '@pommora/core/Actions/connMenu'
import { popModelMenu } from './rowMenu'

export function popConnMenu(
  win: BrowserWindow,
  ctx: ConnMenuContext,
): Promise<ConnMenuAction | null> {
  return popModelMenu<ConnMenuAction>(win, connMenuModel(ctx))
}
