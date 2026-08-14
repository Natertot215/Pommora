// The ViewDropdown's right-click native menu: a dynamic Show/Hide Title toggle over a Style ▸
// Dropdown/Toolbar submenu (current values checked). Resolves the picked action to the renderer, which
// writes it through the one container-config op (view_button / view_style).
import type { BrowserWindow } from 'electron'
import type { ViewButton, ViewStyle } from '@shared/types'
import type { ViewButtonMenuAction } from '@shared/viewMenus'
import { popReturningMenu } from './returningMenu'
import { viewStyleSubmenu } from './styleMenu'

export function popViewButtonMenu(
  win: BrowserWindow,
  current: { viewButton: ViewButton; viewStyle: ViewStyle },
): Promise<ViewButtonMenuAction | null> {
  return popReturningMenu<ViewButtonMenuAction>(win, (pick) => [
    {
      label: current.viewButton === 'labeled' ? 'Hide Title' : 'Show Title',
      click: pick('toggle-title'),
    },
    { type: 'separator' },
    { label: 'Style', submenu: viewStyleSubmenu(current.viewStyle, pick) },
  ])
}
