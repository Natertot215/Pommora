import { dialog } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { optionMenuModel, type OptionMenuAction, type OptionMenuContext } from '@shared/optionMenu'
import { popReturningMenu } from './returningMenu'

/** Confirm copy per destructive action. */
const CONFIRM: Record<
  'option:remove' | 'option:clear',
  { button: string; message: (n: string) => string; detail: string }
> = {
  'option:remove': {
    button: 'Remove',
    message: (n) => `Remove “${n}”?`,
    detail:
      'The option is deleted from the property and its value stripped from every page that had it.',
  },
  'option:clear': {
    button: 'Clear',
    message: (n) => `Clear “${n}” from every page?`,
    detail: 'The option stays; only its assigned values are removed.',
  },
}

/** Pop the option menu natively. Remove/Clear run their confirm HERE and resolve only on confirm —
 *  the renderer never sees an unconfirmed strip. resolve(null) covers a dismissed menu or a cancel. */
export function popOptionMenu(
  win: BrowserWindow,
  ctx: OptionMenuContext,
): Promise<OptionMenuAction | null> {
  return popReturningMenu<OptionMenuAction>(win, (pick, pickAfter) => {
    let separated = false
    const items: MenuItemConstructorOptions[] = []
    for (const it of optionMenuModel(ctx.canEditIcon)) {
      if (it.confirm && !separated) {
        items.push({ type: 'separator' })
        separated = true
      }
      items.push({
        label: it.label,
        click: it.confirm
          ? pickAfter(async () => {
              const copy = CONFIRM[it.action as 'option:remove' | 'option:clear']
              const { response } = await dialog.showMessageBox(win, {
                type: 'warning',
                buttons: [copy.button, 'Cancel'],
                defaultId: 0,
                cancelId: 1,
                message: copy.message(ctx.name),
                detail: copy.detail,
              })
              return response === 0 ? it.action : null
            })
          : pick(it.action),
      })
    }
    return items
  })
}
