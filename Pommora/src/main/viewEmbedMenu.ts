// The view embed's two right-click menus: the title row's chrome menu (icon / title-row
// visibility) and the switcher area's presentation menu (pill titles · New View · Style) — the
// same returning-menu chassis as the ViewDropdown's. Show Title only surfaces in the area menu
// while the title row is hidden: with the row gone, its own right-click target is gone too.
import type { BrowserWindow } from 'electron'
import type { ViewStyle } from '@shared/types'
import type { EmbedAreaMenuAction, EmbedTitleMenuAction } from '@shared/viewMenus'
import { popReturningMenu } from './returningMenu'

const TITLE_SIZES = [1, 2, 3, 4, 5, 6] as const

export function popEmbedTitleMenu(
  win: BrowserWindow,
  iconShown: boolean,
  level: number,
): Promise<EmbedTitleMenuAction | null> {
  return popReturningMenu<EmbedTitleMenuAction>(win, (pick) => [
    { label: iconShown ? 'Hide Icon' : 'Show Icon', click: pick('toggle-icon') },
    {
      label: 'Title Size',
      submenu: TITLE_SIZES.map((n) => ({
        label: `Heading ${n}`,
        type: 'checkbox' as const,
        checked: level === n,
        click: pick(`size-${n}`),
      })),
    },
    { type: 'separator' as const },
    { label: 'Hide Title', click: pick('hide-title') },
  ])
}

export function popEmbedAreaMenu(
  win: BrowserWindow,
  current: { viewStyle: ViewStyle; titleShown: boolean },
): Promise<EmbedAreaMenuAction | null> {
  // The pill-titles toggle lives on the segments' own menu alone — beside the title row's
  // Show/Hide Title, the two near-identical labels read as one control.
  return popReturningMenu<EmbedAreaMenuAction>(win, (pick) => [
    ...(current.titleShown ? [] : [{ label: 'Show Title', click: pick('show-title') }]),
    { label: 'New View', click: pick('new-view') },
    { type: 'separator' as const },
    {
      label: 'Style',
      submenu: [
        {
          label: 'Dropdown',
          type: 'checkbox' as const,
          checked: current.viewStyle === 'dropdown',
          click: pick('style-dropdown'),
        },
        {
          label: 'Toolbar',
          type: 'checkbox' as const,
          checked: current.viewStyle === 'toolbar',
          click: pick('style-toolbar'),
        },
      ],
    },
  ])
}
