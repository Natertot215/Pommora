import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { IconFavoriteMenuAction } from '@shared/identityMenus'

/** The icon picker's right-click menu — a single Favorite/Remove toggle. Resolves 'toggle' on click,
 *  null on dismiss; the renderer owns the favorites write (personalization). */
export function popIconFavoriteMenu(
  win: BrowserWindow,
  favorited: boolean,
): Promise<IconFavoriteMenuAction | null> {
  return new Promise<IconFavoriteMenuAction | null>((resolve) => {
    let acted = false
    const items: MenuItemConstructorOptions[] = [
      {
        label: favorited ? 'Remove from Favorites' : 'Favorite',
        click: () => {
          acted = true
          resolve('toggle')
        },
      },
    ]
    Menu.buildFromTemplate(items).popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}
