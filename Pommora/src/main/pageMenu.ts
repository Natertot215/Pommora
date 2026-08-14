import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { PAGE_MOVE_ROW, type PageMoveContext } from '@shared/pageMenu'
import { type ActionItem, destinationNodes, popReturningMenu } from './returningMenu'

// A menu model's rows as a native template: `separatorBefore` expands into real separator rows, and
// the one row that isn't an act — Move To ▸ — opens the destination tree, where the leaf a person
// lands on is what resolves back as the move. Every native menu built from a model comes through
// here, so the send block can't drift between the surfaces that carry it.
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

/** A menu that is nothing but its model's rows: pop them, resolve the pick. */
export function popModelMenu<A extends string>(
  win: BrowserWindow,
  items: readonly ActionItem<A>[],
): Promise<A | null> {
  return popReturningMenu<A>(win, (pick) => pageMenuTemplate(items, pick))
}
