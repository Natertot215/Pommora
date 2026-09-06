// The ViewDropdown's right-click menu; the renderer writes the pick through `view_button`.
import type { BrowserWindow } from 'electron'
import type { ViewButton } from '@pommora/core/Views/viewRow'
import { type ViewButtonMenuAction, viewButtonMenuItems } from '@pommora/core/Actions/viewMenus'
import { popModelMenu } from './rowMenu'

export function popViewButtonMenu(
  win: BrowserWindow,
  current: { viewButton: ViewButton },
): Promise<ViewButtonMenuAction | null> {
  return popModelMenu<ViewButtonMenuAction>(win, viewButtonMenuItems(current))
}
