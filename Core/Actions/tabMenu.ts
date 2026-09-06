import type { ActionItem } from './menuModel'
import {
  type PageMoveAction,
  type PageSendAction,
  type PageMoveContext,
  pageMetaMenuSubset,
  pageSendActions,
} from './pageMenu'
import { pinLabel } from './toggleLabels'

export interface TabMenuContext extends PageMoveContext {
  /** A pinned tab offers Unpin only (no Close; unpin reveals the ×). */
  pinned: boolean
  /** The NavView tab can't be pinned. */
  isNewTab: boolean
  /** Whether the tab holds a page — only a page has a window to open, a link, and a path. */
  isPage?: boolean
}

export type TabMenuAction = 'pin' | 'unpin' | 'close' | 'window' | PageSendAction | PageMoveAction

/** Being open in a tab doesn't cost the Page Window gesture its row has in the sidebar. */
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
