import {
  type PageMetaAction,
  type PageMenuContext,
  type PageMoveAction,
  pageMetaMenuItems,
} from './pageMenu'
import { type ActionItem, afterSeparator } from './menuModel'

type CardMenuAction = PageMetaAction | PageMoveAction | 'add' | 'image:edit'

interface CardMenuContext extends PageMenuContext {
  addable: boolean
  alreadyOpen?: boolean
  editableImage?: boolean
}

export function cardMenuModel(ctx: CardMenuContext): ActionItem<CardMenuAction>[] {
  const meta = pageMetaMenuItems(ctx.alreadyOpen, {
    newPages: 'single',
    move: ctx,
    clipboard: true,
    history: true,
  }) as ActionItem<CardMenuAction>[]
  const items: ActionItem<CardMenuAction>[] = ctx.editableImage
    ? [{ label: 'Edit Image', action: 'image:edit' }, ...meta]
    : meta
  if (!ctx.addable) return items
  return [{ label: 'Add Property', action: 'add' }, ...afterSeparator(items)]
}
