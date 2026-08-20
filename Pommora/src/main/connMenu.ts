import type { BrowserWindow } from 'electron'
import { connMenuModel, type ConnMenuAction, type ConnMenuContext } from '@shared/connMenu'
import { popModelMenu } from './rowMenu'

// The link right-click menu: main pops the shared model at the cursor and resolves the chosen
// action; resolve(null) covers a dismissed menu so the renderer no-ops.
export function popConnMenu(
  win: BrowserWindow,
  ctx: ConnMenuContext,
): Promise<ConnMenuAction | null> {
  return popModelMenu<ConnMenuAction>(win, connMenuModel(ctx))
}
