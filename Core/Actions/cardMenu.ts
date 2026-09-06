import {
  type PageMetaAction,
  type PageMoveAction,
  type PageMoveContext,
  pageMetaMenuItems,
} from './pageMenu'
import { type ActionItem, afterSeparator } from './menuModel'

export type CardMenuAction = PageMetaAction | `add:${string}` | PageMoveAction | 'image:edit'

export interface CardMenuContext extends PageMoveContext {
  /** Blank, addable properties — already ordered by the renderer (pane-kinds first). */
  addable: Array<{ id: string; name: string }>
  alreadyOpen?: boolean
  /** Image mode with a banner set: Edit Image frames the banner in the picker. */
  editableImage?: boolean
}

/** Add Property ▸ leads when the card has a blank property to add; absent otherwise. */
export function cardMenuModel(ctx: CardMenuContext): ActionItem<CardMenuAction>[] {
  const meta = pageMetaMenuItems(ctx.alreadyOpen, {
    newPages: 'single',
    move: ctx,
    clipboard: true,
    history: true,
  })
  const items: ActionItem<CardMenuAction>[] = ctx.editableImage
    ? [{ label: 'Edit Image', action: 'image:edit' }, ...meta]
    : meta
  if (ctx.addable.length === 0) return items
  return [
    {
      label: 'Add Property',
      action: `add:${ctx.addable[0].id}`,
      submenu: ctx.addable.map((d) => ({ label: d.name, action: `add:${d.id}` as const })),
    },
    ...afterSeparator(items),
  ]
}
