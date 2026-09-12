import type { ActionItem } from './menuModel'
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
}

type TabMenuAction = 'pin' | 'unpin' | 'close' | 'window' | PageSendAction | PageMoveAction

export function tabMenuItems(ctx: TabMenuContext): ActionItem<TabMenuAction>[] {
  const items: ActionItem<TabMenuAction>[] = []
  if (ctx.isPage)
    items.push(
      { label: 'Open Preview', action: 'window' },
      ...pageMetaMenuSubset(pageSendActions(ctx), undefined, ctx).map((r, i) =>
        i === 0 ? { ...r, separatorBefore: true } : r,
      ),
    )
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
