import type { BrowserWindow } from 'electron'
import {
  citationMenuModel,
  type CitationMenuAction,
  type CitationMenuContext,
} from '@pommora/core/Actions/citationMenu'
import { popModelMenu } from './rowMenu'

export function popCitationMenu(
  win: BrowserWindow,
  ctx: CitationMenuContext,
): Promise<CitationMenuAction | null> {
  return popModelMenu<CitationMenuAction>(win, citationMenuModel(ctx))
}
