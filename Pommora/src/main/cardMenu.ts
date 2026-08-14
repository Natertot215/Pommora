import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { cardMenuModel, type CardMenuAction, type CardMenuContext } from '@shared/cardMenu'
import { pageMenuTemplate } from './pageMenu'
import { popReturningMenu } from './returningMenu'

// The card's right-click menu — the page-meta items plus an Add Property ▸ submenu of the card's
// addable properties, with the send block's Move To ▸ tree expanded by the shared page template.
export function popCardMenu(
  win: BrowserWindow,
  ctx: CardMenuContext,
): Promise<CardMenuAction | null> {
  const model = cardMenuModel(ctx)
  return popReturningMenu<CardMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (model.addProperty && model.addProperty.length > 0) {
      items.push({
        label: 'Add Property',
        submenu: model.addProperty.map((a) => ({ label: a.label, click: pick(a.action) })),
      })
      items.push({ type: 'separator' })
    }
    items.push(...pageMenuTemplate(model.items, pick, ctx))
    return items
  })
}
