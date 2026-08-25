// The card's right-click menu: page-meta actions (Open · Rename · Edit Icon · Delete), an
// Add Property ▸ submenu of the card's blank, addable properties, and the send block the other page
// menus carry — Move To ▸ over the Collection/Set tree, then the two copies. The renderer builds both
// trees (already ordered) and routes the chosen action; main maps this model to Electron MenuItems.

import {
  type PageMetaAction,
  type PageMoveAction,
  type PageMoveContext,
  offersMove,
  pageMetaMenuItems,
} from './pageMenu'
import type { ActionItem } from './menuModel'

export type CardMenuAction = PageMetaAction | `add:${string}` | PageMoveAction | 'image:edit'

export interface CardMenuContext extends PageMoveContext {
  /** Blank, addable properties — already ordered by the renderer (pane-kinds first). */
  addable: Array<{ id: string; name: string }>
  /** An open page reads "Open" (focus its tab) rather than "Open New Tab". */
  alreadyOpen?: boolean
  /** Cover mode with a cover set — the card's own Edit Image, framing the cover in the picker. */
  editableImage?: boolean
}

export interface CardMenuModel {
  items: ActionItem<CardMenuAction>[]
  /** The Add Property ▸ submenu; absent when the card has no addable property. */
  addProperty?: ActionItem<CardMenuAction>[]
}

/** The pure per-card item model — main maps it to Electron MenuItems. */
export function cardMenuModel(ctx: CardMenuContext): CardMenuModel {
  const meta = pageMetaMenuItems(ctx.alreadyOpen, {
    newPages: 'single',
    move: offersMove(ctx),
    clipboard: true,
  })
  return {
    items: ctx.editableImage ? [{ label: 'Edit Image', action: 'image:edit' }, ...meta] : meta,
    addProperty:
      ctx.addable.length > 0
        ? ctx.addable.map((d) => ({ label: d.name, action: `add:${d.id}` as const }))
        : undefined,
  }
}
