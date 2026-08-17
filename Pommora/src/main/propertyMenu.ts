import { dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  propertyMenuModel,
  type PropertyMenuAction,
  type PropertyMenuContext,
} from '@shared/propertyMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'

/** Pop the property menu natively. `property:destroy` runs its confirm dialog HERE and resolves only
 *  on confirm — the renderer never sees an unconfirmed destroy. */
export function popPropertyMenu(
  win: BrowserWindow,
  ctx: PropertyMenuContext,
): Promise<PropertyMenuAction | null> {
  const confirmDestroy = async (): Promise<PropertyMenuAction | null> => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Delete', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: `Delete “${ctx.name}” everywhere?`,
      detail:
        'It is removed from every collection; a restorable record lands in the nexus’s .trash folder.',
    })
    return response === 0 ? 'property:destroy' : null
  }
  return popReturningMenu<PropertyMenuAction>(win, (pick, pickAfter) =>
    rowTemplate(propertyMenuModel(ctx), (action) =>
      action === 'property:destroy' ? pickAfter(confirmDestroy) : pick(action),
    ),
  )
}
