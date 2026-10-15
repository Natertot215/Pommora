import { type ActionItem, joinGroups } from './menuModel'
import type { BannerMenuAction } from './identityMenus'
import {
  type PageMoveAction,
  type PageSendAction,
  type PageMenuContext,
  pageSendGroups,
  RENAME_ROW,
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
  active?: boolean
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
  | typeof RENAME_ROW.action
  | PageSendAction
  | PageMoveAction

export function tabMenuItems(ctx: TabMenuContext): ActionItem<TabMenuAction>[] {
  const send = ctx.kind === 'page' ? pageSendGroups(ctx).flat() : []
  // Only the page on show renames, in the label it shows; a pinned tab draws none.
  const rename =
    ctx.kind === 'page' && ctx.active && !(ctx.row === 'main' && ctx.pinned) ? [RENAME_ROW] : []
  if (ctx.row === 'window')
    return joinGroups<TabMenuAction>([
      [{ label: 'New Tab', action: 'promote' }],
      [...rename, ...(ctx.banner ?? [])],
      send,
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
    rename,
    send,
    ctx.kind === 'newtab'
      ? []
      : [{ label: pinLabel(ctx.pinned), action: ctx.pinned ? 'unpin' : 'pin' }],
    ctx.pinned ? [] : [{ label: 'Close', action: 'close' }],
  ])
}
