import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ActionItem, MenuAnchor, RowMenuRequest } from '@pommora/core/Actions/menuModel'
import { PAGE_MOVE_ROW, type PageMoveContext } from '@pommora/core/Actions/pageMenu'
import { destinationNodes, popReturningMenu } from './returningMenu'

/** The renderer measures in CSS pixels and `popup` places in window DIPs, differing by the window's zoom. */
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

/** Icons are left behind on purpose: an OS menu draws its own. */
function nativeRow<A extends string>(
  item: ActionItem<A>,
  pick: (action: A) => () => void,
): MenuItemConstructorOptions {
  return {
    label: item.label,
    enabled: !item.disabled,
    ...(item.checked !== undefined && { type: 'checkbox' as const, checked: item.checked }),
    // Giving a submenu row a click too would resolve the parent the moment the pointer rested.
    ...(item.submenu ? { submenu: rowTemplate(item.submenu, pick) } : { click: pick(item.action) }),
  }
}

/** A FRAGMENT, so `separatorBefore` expands verbatim; dropping one that leads a whole menu is `menuTemplate`'s job. */
export function rowTemplate<A extends string>(
  items: readonly ActionItem<A>[],
  pick: (action: A) => () => void,
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
          (t) => pick(`move:${t.path}` as A),
          (t) => t.path === move?.currentParentPath,
        ),
      })
    else template.push(nativeRow(item, pick))
  }
  return template
}

/** The fragment above, minus a leading divider, which would separate nothing. */
export function menuTemplate<A extends string>(
  items: readonly ActionItem<A>[],
  pick: (action: A) => () => void,
): MenuItemConstructorOptions[] {
  const template = rowTemplate(items, pick)
  return template[0]?.type === 'separator' ? template.slice(1) : template
}

export function popModelMenu<A extends string>(
  win: BrowserWindow,
  items: readonly ActionItem<A>[],
): Promise<A | null> {
  return popReturningMenu<A>(win, (pick) => menuTemplate(items, pick))
}

export function popRowMenu(win: BrowserWindow, req: RowMenuRequest): Promise<string | null> {
  return popReturningMenu<string>(
    win,
    (pick) => menuTemplate(req.items, pick),
    anchorPoint(win, req.anchor),
  )
}
