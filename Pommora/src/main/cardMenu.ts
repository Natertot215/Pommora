import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { cardMenuModel, type CardMenuAction, type CardMenuContext } from '@shared/cardMenu'
import { destinationNodes, popReturningMenu } from './returningMenu'

// The card's right-click menu — the page-meta items plus an Add Property ▸ submenu of the card's
// addable properties and a Move To ▸ tree of destination containers.
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
    }
    const hasAddProperty = items.length > 0
    model.items.forEach((it, i) => {
      if (it.separatorBefore || (i === 0 && hasAddProperty)) items.push({ type: 'separator' })
      items.push({ label: it.label, click: pick(it.action) })
      // Move To ▸ sits directly below the opening action (Open / Open New Tab). The page's current
      // parent is offered and disabled — moving there is a no-op, not an absence.
      if (it.action === 'title:newtab' && model.moveTo && model.moveTo.length > 0)
        items.push({
          label: 'Move To',
          submenu: destinationNodes(
            model.moveTo,
            (t) => pick(`move:${t.path}`),
            (t) => t.path === model.currentParentPath,
          ),
        })
    })
    return items
  })
}
