import { type ActionItem, joinGroups, openOrder } from './menuModel'
import {
  type PageMoveAction,
  type PageMenuContext,
  type PageSendAction,
  pageSendGroups,
} from './pageMenu'
import { openLabel, pinLabel } from './toggleLabels'
import { isWindowTarget, type NavRef } from '../Navigation/navRef'

export interface NavRowMenuContext extends PageMenuContext {
  canOpenNewTab: boolean
  alreadyOpen: boolean
  kind: NavRef['kind']
  isPinned: boolean
}

type NavRowMenuAction =
  | 'open-new-tab'
  | 'open-window'
  | 'pin'
  | 'unpin'
  | 'remove'
  | PageSendAction
  | PageMoveAction

export function navRowMenuItems(ctx: NavRowMenuContext): ActionItem<NavRowMenuAction>[] {
  return joinGroups<NavRowMenuAction>([
    openOrder<NavRowMenuAction>(
      ctx.alreadyOpen,
      ctx.canOpenNewTab ? [{ label: openLabel(ctx.alreadyOpen), action: 'open-new-tab' }] : [],
      isWindowTarget(ctx) ? [{ label: 'Preview', action: 'open-window' }] : [],
    ),
    // A recent is a stored ref, addressable only once the renderer has minted a live path.
    ...(ctx.kind === 'page' && ctx.currentParentPath !== undefined ? pageSendGroups(ctx) : []),
    [{ label: pinLabel(ctx.isPinned), action: ctx.isPinned ? 'unpin' : 'pin' }],
    [{ label: 'Remove', action: 'remove' }],
  ])
}
