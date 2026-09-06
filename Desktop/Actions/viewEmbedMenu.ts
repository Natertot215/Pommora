import type { BrowserWindow } from 'electron'
import type { ViewStyle } from '@pommora/core/Views/viewRow'
import {
  type EmbedAreaMenuAction,
  type EmbedTitleMenuAction,
  embedAreaMenuItems,
  embedTitleMenuItems,
} from '@pommora/core/Actions/viewMenus'
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
