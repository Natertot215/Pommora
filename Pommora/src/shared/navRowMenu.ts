// The NavWindow row/card right-click menu — a NATIVE Electron menu (like the tab/cell menus),
// not an in-renderer surface. The renderer sends the row's live membership state; main pops the menu
// and returns the chosen action (or null on dismiss); the renderer runs it against the row it held.

import type { PageMoveAction, PageMoveContext, PageSendAction } from './pageMenu'

export interface NavRowMenuContext extends PageMoveContext {
  /** Open lands a tab — the label reads "Open" when the target is already open, else "Open New Tab". */
  canOpenNewTab: boolean
  alreadyOpen: boolean
  /** Only pages offer Open Preview. */
  isPage: boolean
  isPinned: boolean
  isFavorite: boolean
}

export type NavRowMenuAction =
  | 'open-new-tab'
  | 'open-window'
  | 'pin'
  | 'unpin'
  | 'favorite'
  | 'unfavorite'
  | 'remove'
  | PageSendAction
  | PageMoveAction
