import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ActionItem, MenuAnchor, MenuRequest } from '@pommora/core/Actions/menuModel'

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
    ...(item.checked !== undefined &&
      !item.submenu && { type: 'checkbox' as const, checked: item.checked }),
    // Giving a submenu row a click too would resolve the parent the moment the pointer rested.
    ...(item.submenu ? { submenu: rowTemplate(item.submenu, pick) } : { click: pick(item.action) }),
  }
}

export function rowTemplate<A extends string>(
  items: readonly ActionItem<A>[],
  pick: (action: A) => () => void,
): MenuItemConstructorOptions[] {
  return items.flatMap((item) => [
    ...(item.separatorBefore ? [{ type: 'separator' as const }] : []),
    nativeRow(item, pick),
  ])
}

// The action resolves back to the renderer, which performs the write and asks where one needs confirming.
export function popNativeMenu(win: BrowserWindow, req: MenuRequest): Promise<string | null> {
  return new Promise((resolve) => {
    const template = rowTemplate(req.items, (action) => () => resolve(action))
    // A model that gated every item away has nothing to show; popping it would leave an empty frame.
    if (template.length === 0) return resolve(null)
    Menu.buildFromTemplate(template).popup({
      window: win,
      ...anchorPoint(win, req.anchor),
      callback: () => resolve(null),
    })
  })
}
