// The table row grip's right-click menu — the full page-meta block with the preview and
// New Page items requested. Its own channel: the block grip's `grip-menu` belongs to the
// editor and stays untouched.

import { type PageMetaAction, pageMetaMenuItems } from './pageMenu'

export type RowGripMenuAction = PageMetaAction

export interface RowGripMenuContext {
  alreadyOpen?: boolean
}

export function rowGripMenuModel(ctx: RowGripMenuContext): {
  items: Array<{ label: string; action: RowGripMenuAction; separatorBefore?: boolean }>
} {
  return { items: pageMetaMenuItems(ctx.alreadyOpen, { preview: true, newPages: 'pair' }) }
}
