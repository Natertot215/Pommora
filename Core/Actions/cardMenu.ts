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
  alreadyOpen?: boolean
  /** Image mode with a banner set: Edit Image frames the banner in the picker. */
  editableImage?: boolean
}

export interface CardMenuModel {
  items: ActionItem<CardMenuAction>[]
  /** The Add Property ▸ submenu; absent when the card has no addable property. */
  addProperty?: ActionItem<CardMenuAction>[]
}

export function cardMenuModel(ctx: CardMenuContext): CardMenuModel {
  const meta = pageMetaMenuItems(ctx.alreadyOpen, {
    newPages: 'single',
    move: offersMove(ctx),
    clipboard: true,
    history: true,
  })
  return {
    items: ctx.editableImage ? [{ label: 'Edit Image', action: 'image:edit' }, ...meta] : meta,
    addProperty:
      ctx.addable.length > 0
        ? ctx.addable.map((d) => ({ label: d.name, action: `add:${d.id}` as const }))
        : undefined,
  }
}
