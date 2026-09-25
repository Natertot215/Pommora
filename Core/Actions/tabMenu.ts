import { type ActionItem, joinGroups } from './menuModel'
import type { BannerMenuAction } from './identityMenus'
import {
  type PageMoveAction,
  type PageSendAction,
  type PageMenuContext,
  pageSendGroups,
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
  const send = ctx.kind === 'page' ? pageSendGroups(ctx) : []
  if (ctx.row === 'window')
    return joinGroups<TabMenuAction>([
      [{ label: 'Open In New Tab', action: 'promote' }],
      ...send,
      ctx.banner ?? [],
      [{ label: 'Close', action: 'close' }],
    ])
  const open: ActionItem<TabMenuAction>[] = []
  if (ctx.pinned && ctx.kind !== 'newtab')
    open.push({ label: 'Open', action: 'open', disabled: ctx.active })
  // Only one Matrix window stands; a tabbed window takes another tab instead.
  if (isWindowTarget(ctx) || ctx.kind === 'matrix')
    open.push({
      label: 'Preview',
      action: 'window',
      disabled: ctx.kind === 'matrix' && ctx.matrixWindowOpen,
    })
  return joinGroups<TabMenuAction>([
    open,
    ...send,
    ctx.kind === 'newtab'
      ? []
      : [{ label: pinLabel(ctx.pinned), action: ctx.pinned ? 'unpin' : 'pin' }],
    ctx.pinned ? [] : [{ label: 'Close', action: 'close' }],
  ])
}
