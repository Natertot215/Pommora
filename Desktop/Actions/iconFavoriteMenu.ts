import type { BrowserWindow } from 'electron'
import type { IconFavoriteMenuAction } from '@pommora/core/Actions/identityMenus'
import { popReturningMenu } from './returningMenu'

/** The renderer owns the favorites write (personalization). */
export function popIconFavoriteMenu(
  win: BrowserWindow,
  favorited: boolean,
): Promise<IconFavoriteMenuAction | null> {
  return popReturningMenu<IconFavoriteMenuAction>(win, (pick) => [
    { label: favorited ? 'Remove from Favorites' : 'Favorite', click: pick('toggle') },
  ])
}
