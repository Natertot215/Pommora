import type { BrowserWindow } from 'electron'
import {
  citationMenuModel,
  type CitationMenuAction,
  type CitationMenuContext,
} from '@shared/citationMenu'
import { popModelMenu } from './rowMenu'

// The footnote right-click menu: main pops the shared model at the cursor and resolves the chosen
// action; resolve(null) covers a dismissed menu so the renderer no-ops.
export function popCitationMenu(
  win: BrowserWindow,
  ctx: CitationMenuContext,
): Promise<CitationMenuAction | null> {
  return popModelMenu<CitationMenuAction>(win, citationMenuModel(ctx))
}
