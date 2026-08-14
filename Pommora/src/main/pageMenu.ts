import type { MenuItemConstructorOptions } from 'electron'
import { PAGE_MOVE_ROW, type PageMoveContext } from '@shared/pageMenu'
import { type ActionItem, destinationNodes } from './returningMenu'

// The page menu as a native template — `menuTemplate` plus the one row that isn't an act: Move To ▸
// opens the destination tree, and the leaf a person lands on is what resolves back as the move.
// Every surface that pops a page menu builds through here, so the send block can't drift between them.
export function pageMenuTemplate<A extends string>(
  items: readonly ActionItem<A>[],
  click: (action: A) => () => void,
  move?: PageMoveContext,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []
  for (const item of items) {
    if (item.separatorBefore) template.push({ type: 'separator' })
    if (item.action === PAGE_MOVE_ROW)
      template.push({
        label: item.label,
        submenu: destinationNodes(
          move?.moveTargets ?? [],
          (t) => click(`move:${t.path}` as A),
          (t) => t.path === move?.currentParentPath,
        ),
      })
    else template.push({ label: item.label, click: click(item.action) })
  }
  return template
}
