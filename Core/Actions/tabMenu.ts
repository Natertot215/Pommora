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
  /** The target also stands in a floating window — a page or the Matrix. */
  previews?: boolean
}

type TabMenuAction = 'open' | 'pin' | 'unpin' | 'close' | 'window' | PageSendAction | PageMoveAction

export function tabMenuItems(ctx: TabMenuContext): ActionItem<TabMenuAction>[] {
  const items: ActionItem<TabMenuAction>[] = []
  // A pinned tab is a bare glyph, so its menu names the way into the pane that an unpinned tab already is.
  if (ctx.pinned && !ctx.isNewTab) items.push({ label: 'Open', action: 'open' })
  if (ctx.previews) items.push({ label: 'Preview', action: 'window' })
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
