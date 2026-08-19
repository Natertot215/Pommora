// The generic row menu: a model of plain rows, popped as an OS menu, resolving the chosen action.
// Every menu that is a list rather than a surface comes through here, which is what lets the same
// model reach the OS or an in-app pane without either renderer knowing about the other.
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ActionItem, MenuAnchor, RowMenuRequest } from '@shared/menuModel'
import { PAGE_MOVE_ROW, type PageMoveContext } from '@shared/pageMenu'
import { destinationNodes, popReturningMenu } from './returningMenu'

/** The renderer measures in CSS pixels; `popup` places in window DIPs, and the two differ by
 *  exactly the zoom the window is running at. Converted in one place: an anchor that skips this
 *  lands further from its trigger the further the user is zoomed from 1.
 *
 *  A dropdown hangs from its trigger's bottom-left, so that corner is the popup's origin. */
export function anchorPoint(
  win: BrowserWindow,
  anchor: MenuAnchor | undefined,
): { x: number; y: number } | undefined {
  if (!anchor) return undefined
  const zoom = win.webContents.getZoomFactor()
  return {
    x: Math.round(anchor.left * zoom),
    y: Math.round((anchor.top + anchor.height) * zoom),
  }
}

/** One model row as a native item — the single statement of what a row becomes, whichever menu
 *  carries it. A row carrying `checked` becomes a checkbox so the choice in force reads at a glance.
 *  Icons are left behind on purpose: an OS menu draws its own, and there is no honest way to hand it
 *  one. */
export function nativeRow<A extends string>(
  item: ActionItem<A>,
  pick: (action: A) => () => void,
): MenuItemConstructorOptions {
  return {
    label: item.label,
    enabled: !item.disabled,
    ...(item.checked !== undefined && { type: 'checkbox' as const, checked: item.checked }),
    // A row that leads somewhere takes no click of its own: the OS opens the branch, and the leaf
    // resolves. Giving it both would resolve the parent the moment the pointer rested on it.
    ...(item.submenu ? { submenu: rowTemplate(item.submenu, pick) } : { click: pick(item.action) }),
  }
}

/** A model's rows as a native template. `separatorBefore` expands into real separator rows, and a
 *  leading one is dropped since it separates nothing. The one row that isn't an act — Move To ▸ —
 *  opens the destination tree, where the leaf a person lands on is what resolves back as the move;
 *  a menu carrying that row passes the context it moves within. Every native menu built from a
 *  model comes through here, so the send block can't drift between the surfaces that carry it. */
export function rowTemplate<A extends string>(
  items: readonly ActionItem<A>[],
  pick: (action: A) => () => void,
  move?: PageMoveContext,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []
  for (const item of items) {
    if (item.separatorBefore && template.length > 0) template.push({ type: 'separator' })
    if (item.action === PAGE_MOVE_ROW)
      template.push({
        label: item.label,
        submenu: destinationNodes(
          move?.moveTargets ?? [],
          (t) => pick(`move:${t.path}` as A),
          (t) => t.path === move?.currentParentPath,
        ),
      })
    else template.push(nativeRow(item, pick))
  }
  return template
}

/** A menu that is nothing but its model's rows: pop them, resolve the pick. */
export function popModelMenu<A extends string>(
  win: BrowserWindow,
  items: readonly ActionItem<A>[],
): Promise<A | null> {
  return popReturningMenu<A>(win, (pick) => rowTemplate(items, pick))
}

export function popRowMenu(win: BrowserWindow, req: RowMenuRequest): Promise<string | null> {
  return popReturningMenu<string>(
    win,
    (pick) => rowTemplate(req.items, pick),
    anchorPoint(win, req.anchor),
  )
}
