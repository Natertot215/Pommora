// The card's right-click menu: page-meta actions (Open · Rename · Change Icon · Delete), an
// Add Property ▸ submenu of the card's blank, addable properties, and a Move To ▸ submenu that walks
// the Collection/Set tree (each node relocates the page there via movePage). The renderer builds both
// trees (already ordered) and routes the chosen action; main maps this model to Electron MenuItems.

import { type PageMetaAction, pageMetaMenuItems } from './pageMenu'

export type CardMenuAction = PageMetaAction | `add:${string}` | `move:${string}`

/** One destination an entity may be sent to. `children` are its sub-sets (a nested submenu).
 *  Both addresses ride along because the two consumers address differently: `path` is the move's
 *  `newParentPath`, and `id` is what a restore resolves its parent by — deriving one from the
 *  other main-side would put name-addressing back at the seam built to avoid it. */
export interface MoveTarget {
  id: string
  label: string
  path: string
  children?: MoveTarget[]
}

export interface CardMenuContext {
  /** Blank, addable properties — already ordered by the renderer (pane-kinds first). */
  addable: Array<{ id: string; name: string }>
  /** The Collection/Set tree the page can move into (renderer-built from the nexus tree). */
  moveTargets?: MoveTarget[]
  /** The page's current parent path — its own "Move Here" is disabled (moving there is a no-op). */
  currentParentPath?: string
  /** An open page reads "Open" (focus its tab) rather than "Open New Tab". */
  alreadyOpen?: boolean
}

export interface CardMenuModel {
  items: Array<{ label: string; action: CardMenuAction; separatorBefore?: boolean }>
  /** The Add Property ▸ submenu; absent when the card has no addable property. */
  addProperty?: Array<{ label: string; action: CardMenuAction }>
  /** The Move To ▸ tree; absent when there's nowhere else to move the page. */
  moveTo?: MoveTarget[]
  currentParentPath?: string
}

/** The pure per-card item model — main maps it to Electron MenuItems. */
export function cardMenuModel(ctx: CardMenuContext): CardMenuModel {
  return {
    items: pageMetaMenuItems(ctx.alreadyOpen, { newPages: 'single' }),
    addProperty:
      ctx.addable.length > 0
        ? ctx.addable.map((d) => ({ label: d.name, action: `add:${d.id}` as const }))
        : undefined,
    moveTo: ctx.moveTargets && ctx.moveTargets.length > 0 ? ctx.moveTargets : undefined,
    currentParentPath: ctx.currentParentPath,
  }
}
