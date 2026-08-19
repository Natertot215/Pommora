// The ViewDropdown's right-click native menu. Resolves the picked action to the renderer, which
// writes it through the one container-config op (view_button / view_style).
import type { BrowserWindow } from 'electron'
import type { ViewButton, ViewStyle } from '@shared/types'
import { type ViewButtonMenuAction, viewButtonMenuItems } from '@shared/viewMenus'
import { popModelMenu } from './rowMenu'

export function popViewButtonMenu(
  win: BrowserWindow,
  current: { viewButton: ViewButton; viewStyle: ViewStyle },
): Promise<ViewButtonMenuAction | null> {
  return popModelMenu<ViewButtonMenuAction>(win, viewButtonMenuItems(current))
}
