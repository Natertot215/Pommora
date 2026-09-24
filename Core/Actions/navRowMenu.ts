import { type ActionItem, openOrder } from './menuModel'
import {
  type PageMoveAction,
  type PageMenuContext,
  type PageSendAction,
  pageMetaMenuSubset,
  pageSendActions,
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
  const isPage = ctx.kind === 'page'
  const items: ActionItem<NavRowMenuAction>[] = []
  items.push(
    ...openOrder<NavRowMenuAction>(
      ctx.alreadyOpen,
      ctx.canOpenNewTab ? [{ label: openLabel(ctx.alreadyOpen), action: 'open-new-tab' }] : [],
      isWindowTarget(ctx) ? [{ label: 'Preview', action: 'open-window' }] : [],
    ),
  )
  const opens = items.length > 0
  // A recent is a stored ref, addressable only once the renderer has minted a live path.
  if (isPage && ctx.currentParentPath !== undefined)
    items.push(
      ...pageMetaMenuSubset(pageSendActions(ctx), undefined, ctx).map((r, i) =>
        i === 0 ? { ...r, separatorBefore: opens } : r,
      ),
    )
  items.push(
    {
      label: pinLabel(ctx.isPinned),
      action: ctx.isPinned ? 'unpin' : 'pin',
      separatorBefore: items.length > 0,
    },
    { label: 'Remove', action: 'remove', separatorBefore: true },
  )
  return items
}
