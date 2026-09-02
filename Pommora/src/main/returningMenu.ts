// The returning-picker menu plumbing: pop a native menu, resolve the chosen action BACK to the
// renderer (which performs the write, and asks first where the action needs confirming), and
// resolve null when the menu is dismissed. The single home for the `let acted` /
// popup-callback dance every returning menu needs.
import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

/** `pick` resolves a click straight to its action. The click marks the menu acted before it
 *  resolves, so the closing menu can't also be read as a dismissal. */
export function popReturningMenu<A>(
  win: BrowserWindow,
  buildItems: (pick: (action: A) => () => void) => MenuItemConstructorOptions[],
  /** Where the menu opens, in window DIPs. Omitted pops at the cursor — wrong for a menu that
   *  should hang from a clicked control rather than the pointer. */
  at?: { x: number; y: number },
): Promise<A | null> {
  return new Promise((resolve) => {
    let acted = false
    const pick = (action: A) => () => {
      acted = true
      resolve(action)
    }
    const template = buildItems(pick)
    // A model that gated every item away has nothing to show; popping it would leave an empty frame.
    if (template.length === 0) {
      resolve(null)
      return
    }
    Menu.buildFromTemplate(template).popup({
      window: win,
      ...at,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}

/** A destination tree as native submenus. A parent item cannot itself be clicked, so a container
 *  repeats its own name as its submenu's first row above a separator. `disabled` grays a
 *  destination that would be a no-op rather than hiding it. */
export function destinationNodes<T extends { label: string; children?: T[] }>(
  targets: readonly T[],
  pick: (target: T) => () => void,
  disabled?: (target: T) => boolean,
): MenuItemConstructorOptions[] {
  const node = (t: T): MenuItemConstructorOptions => {
    const self: MenuItemConstructorOptions = {
      label: t.label,
      enabled: !disabled?.(t),
      click: pick(t),
    }
    if (!t.children?.length) return self
    return {
      label: t.label,
      submenu: [self, { type: 'separator' }, ...t.children.map(node)],
    }
  }
  return targets.map(node)
}
