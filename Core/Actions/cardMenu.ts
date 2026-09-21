import {
  type PageMetaAction,
  type PageMenuContext,
  type PageMoveAction,
  pageMetaMenuItems,
} from './pageMenu'
import type { ActionItem } from './menuModel'

type CardMenuAction = PageMetaAction | PageMoveAction | 'image:edit'

interface CardMenuContext extends PageMenuContext {
  alreadyOpen?: boolean
  editableImage?: boolean
}

export function cardMenuModel(ctx: CardMenuContext): ActionItem<CardMenuAction>[] {
  const meta = pageMetaMenuItems(ctx.alreadyOpen, {
    newPages: 'single',
    move: ctx,
    spaces: ctx.spaces,
    properties: ctx.properties,
    clipboard: true,
    history: true,
  }) as ActionItem<CardMenuAction>[]
  return ctx.editableImage ? [{ label: 'Edit Image', action: 'image:edit' }, ...meta] : meta
}
