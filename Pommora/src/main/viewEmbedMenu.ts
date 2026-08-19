// The view embed's two right-click menus: the title row's chrome menu (icon / title-row visibility)
// and the switcher area's presentation menu (pill titles · New View · Style).
import type { BrowserWindow } from 'electron'
import type { ViewStyle } from '@shared/types'
import {
  type EmbedAreaMenuAction,
  type EmbedTitleMenuAction,
  embedAreaMenuItems,
  embedTitleMenuItems,
} from '@shared/viewMenus'
import { popModelMenu } from './rowMenu'

export function popEmbedTitleMenu(
  win: BrowserWindow,
  iconShown: boolean,
  level: number,
): Promise<EmbedTitleMenuAction | null> {
  return popModelMenu<EmbedTitleMenuAction>(win, embedTitleMenuItems(iconShown, level))
}

export function popEmbedAreaMenu(
  win: BrowserWindow,
  current: { viewStyle: ViewStyle; titleShown: boolean },
): Promise<EmbedAreaMenuAction | null> {
  return popModelMenu<EmbedAreaMenuAction>(win, embedAreaMenuItems(current))
}
