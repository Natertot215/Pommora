import { afterSeparator, type ActionItem } from './menuModel'
import type { BannerMenuAction } from './identityMenus'
import {
  type PageMoveAction,
  type PageSendAction,
  type PageMenuContext,
  pageMetaMenuSubset,
  pageSendActions,
} from './pageMenu'
import { pinLabel } from './toggleLabels'
import { isWindowTarget, type TabTarget, type WindowTarget } from '../Navigation/navRef'

interface TabMainContext extends PageMenuContext {
  row: 'main'
  kind: TabTarget['kind']
  pinned: boolean
  active?: boolean
  matrixWindowOpen?: boolean
}

interface TabWindowContext extends PageMenuContext {
  row: 'window'
  kind: WindowTarget['kind']
  banner?: readonly ActionItem<BannerMenuAction>[]
}

type TabMenuContext = TabMainContext | TabWindowContext

// The row a context names is what decides which of these the caller can actually receive.
type TabMenuAction =
  | 'open'
  | 'pin'
  | 'unpin'
  | 'close'
  | 'window'
  | 'promote'
  | BannerMenuAction
  | PageSendAction
  | PageMoveAction

export function tabMenuItems(ctx: TabMenuContext): ActionItem<TabMenuAction>[] {
  const items: ActionItem<TabMenuAction>[] = []
  const isPage = ctx.kind === 'page'
  if (ctx.row === 'main') {
    if (ctx.pinned && ctx.kind !== 'newtab')
      items.push({ label: 'Open', action: 'open', disabled: ctx.active })
    // Only one Matrix window stands; a tabbed window takes another tab instead.
    if (isWindowTarget(ctx) || ctx.kind === 'matrix')
      items.push({
        label: 'Preview',
        action: 'window',
        disabled: ctx.kind === 'matrix' && ctx.matrixWindowOpen,
      })
  } else items.push({ label: 'Open In New Tab', action: 'promote' })
  if (isPage)
    items.push(...afterSeparator(pageMetaMenuSubset(pageSendActions(ctx), undefined, ctx)))
  if (ctx.row === 'window' && ctx.banner) items.push(...afterSeparator<TabMenuAction>(ctx.banner))
  if (ctx.row === 'main' && ctx.kind !== 'newtab')
    items.push({
      label: pinLabel(ctx.pinned),
      action: ctx.pinned ? 'unpin' : 'pin',
      separatorBefore: items.length > 0,
    })
  if (ctx.row === 'window' || !ctx.pinned)
    items.push({ label: 'Close', action: 'close', separatorBefore: items.length > 0 })
  return items
}
