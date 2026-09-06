import type { PageMoveAction, PageMoveContext, PageSendAction } from './pageMenu'

export interface NavRowMenuContext extends PageMoveContext {
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
