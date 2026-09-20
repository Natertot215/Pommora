import { afterSeparator, type ActionItem } from './menuModel'
import {
  type PageMoveAction,
  type PageSendAction,
  type PageMenuContext,
  pageMetaMenuSubset,
  pageSendActions,
} from './pageMenu'
import { pinLabel } from './toggleLabels'

interface TabMenuContext extends PageMenuContext {
  pinned: boolean
  isNewTab: boolean
  isPage?: boolean
  isMatrix?: boolean
  active?: boolean
  matrixWindowOpen?: boolean
}

type TabMenuAction = 'open' | 'pin' | 'unpin' | 'close' | 'window' | PageSendAction | PageMoveAction

export function tabMenuItems(ctx: TabMenuContext): ActionItem<TabMenuAction>[] {
  const items: ActionItem<TabMenuAction>[] = []
  if (ctx.pinned && !ctx.isNewTab)
    items.push({ label: 'Open', action: 'open', disabled: ctx.active })
  // Only one Matrix window stands, where a Page Window re-points at whatever page asks for it.
  if (ctx.isPage || ctx.isMatrix)
    items.push({
      label: 'Preview',
      action: 'window',
      disabled: ctx.isMatrix && ctx.matrixWindowOpen,
    })
  if (ctx.isPage)
    items.push(...afterSeparator(pageMetaMenuSubset(pageSendActions(ctx), undefined, ctx)))
  if (!ctx.isNewTab)
    items.push({
      label: pinLabel(ctx.pinned),
      action: ctx.pinned ? 'unpin' : 'pin',
      separatorBefore: items.length > 0,
    })
  if (!ctx.pinned)
    items.push({ label: 'Close', action: 'close', separatorBefore: items.length > 0 })
  return items
}
