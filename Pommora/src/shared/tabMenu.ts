// The tab right-click menu — a NATIVE Electron menu (like the sidebar/cell menus), not an
// in-renderer surface. The renderer sends the tab's context; main pops the menu and returns the chosen
// action (or null on dismiss); the renderer runs it against the tab id it held.

import type { PageMoveAction, PageSendAction, PageMoveContext } from './pageMenu'

export interface TabMenuContext extends PageMoveContext {
  /** A pinned tab offers Unpin only (no Close; unpin reveals the ×). */
  pinned: boolean
  /** The NavView tab can't be pinned. */
  isNewTab: boolean
  /** Whether the tab holds a page — only a page has a window to open, a link, and a path. */
  isPage?: boolean
}

export type TabMenuAction = 'pin' | 'unpin' | 'close' | 'window' | PageSendAction | PageMoveAction
