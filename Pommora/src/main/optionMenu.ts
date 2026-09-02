import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { optionMenuModel, type OptionMenuAction, type OptionMenuContext } from '@shared/optionMenu'
import { popReturningMenu } from './returningMenu'

/** Pop the option menu natively. Remove and Clear resolve unconfirmed — the renderer asks, because
 *  it is the renderer that performs the strip. */
export function popOptionMenu(
  win: BrowserWindow,
  ctx: OptionMenuContext,
): Promise<OptionMenuAction | null> {
  return popReturningMenu<OptionMenuAction>(win, (pick) => {
    let separated = false
    const items: MenuItemConstructorOptions[] = []
    for (const it of optionMenuModel(ctx.canEditIcon)) {
      if (it.confirm && !separated) {
        items.push({ type: 'separator' })
        separated = true
      }
      items.push({ label: it.label, click: pick(it.action) })
    }
    return items
  })
}
