import type { ActionItem } from './menuModel'
import {
  type PageMoveAction,
  type PageMenuContext,
  type PageSendAction,
  pageMetaMenuSubset,
  pageSendActions,
} from './pageMenu'
import { favoriteLabel, openLabel, pinLabel } from './toggleLabels'

export interface NavRowMenuContext extends PageMenuContext {
  canOpenNewTab: boolean
  alreadyOpen: boolean
  isPage: boolean
  isPinned: boolean
  isFavorite: boolean
}

type NavRowMenuAction =
  | 'open-new-tab'
  | 'open-window'
  | 'pin'
  | 'unpin'
  | 'favorite'
  | 'unfavorite'
  | 'remove'
  | PageSendAction
  | PageMoveAction

export function navRowMenuItems(ctx: NavRowMenuContext): ActionItem<NavRowMenuAction>[] {
  const items: ActionItem<NavRowMenuAction>[] = []
  if (ctx.canOpenNewTab) items.push({ label: openLabel(ctx.alreadyOpen), action: 'open-new-tab' })
  if (ctx.isPage) items.push({ label: 'Open Preview', action: 'open-window' })
  const opens = items.length > 0
  // A recent is a stored ref, addressable only once the renderer has minted a live path.
  if (ctx.isPage && ctx.currentParentPath !== undefined)
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
    { label: favoriteLabel(ctx.isFavorite), action: ctx.isFavorite ? 'unfavorite' : 'favorite' },
    { label: 'Remove', action: 'remove', separatorBefore: true },
  )
  return items
}
