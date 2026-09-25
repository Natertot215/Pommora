import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { ActionItem, MenuAnchor, MenuRequest } from '@pommora/core/Actions/menuModel'
import { toAccelerator } from '@pommora/core/Actions/commands'

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
  const row = { label: item.label, enabled: !item.disabled }
  if (item.submenu)
    return item.submenu.length > 0
      ? { ...row, submenu: rowTemplate(item.submenu, pick) }
      : { ...row, enabled: false }
  return {
    ...row,
    ...(item.checked !== undefined && { type: 'checkbox' as const, checked: item.checked }),
    // Display-only: the editor's keymap binds the chord itself.
    ...(item.chord && { accelerator: toAccelerator(item.chord), registerAccelerator: false }),
    click: pick(item.action),
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
