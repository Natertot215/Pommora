import type { BrowserWindow } from 'electron'
import type { IconFavoriteMenuAction } from '@shared/identityMenus'
import { popReturningMenu } from './returningMenu'

/** The icon picker's right-click menu — a single Favorite/Remove toggle. Resolves 'toggle' on click,
 *  null on dismiss; the renderer owns the favorites write (personalization). */
export function popIconFavoriteMenu(
  win: BrowserWindow,
  favorited: boolean,
): Promise<IconFavoriteMenuAction | null> {
  return popReturningMenu<IconFavoriteMenuAction>(win, (pick) => [
    { label: favorited ? 'Remove from Favorites' : 'Favorite', click: pick('toggle') },
  ])
}
