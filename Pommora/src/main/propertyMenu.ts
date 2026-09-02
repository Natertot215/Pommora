import type { BrowserWindow } from 'electron'
import {
  propertyMenuModel,
  type PropertyMenuAction,
  type PropertyMenuContext,
} from '@shared/propertyMenu'
import { rowTemplate } from './rowMenu'
import { popReturningMenu } from './returningMenu'

/** Pop the property menu natively. `property:destroy` resolves unconfirmed — the renderer asks,
 *  because it is the renderer that performs the destroy. */
export function popPropertyMenu(
  win: BrowserWindow,
  ctx: PropertyMenuContext,
): Promise<PropertyMenuAction | null> {
  return popReturningMenu<PropertyMenuAction>(win, (pick) =>
    rowTemplate(propertyMenuModel(ctx), pick),
  )
}
