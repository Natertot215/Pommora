// The returning-picker menu plumbing: pop a native menu, resolve the chosen action BACK to the
// renderer (which performs the write), and resolve null when the menu is dismissed. The single
// home for the `let acted` / popup-callback dance every returning menu needs.
import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

/** `buildItems` receives `pick`, a factory turning an action into a click handler that resolves it,
 *  and `pickAfter`, the same for a row that must ask something first — a confirm dialog — and
 *  resolves what that answers with. Both mark the menu acted at click, before any await, so a
 *  dialog opening over the closing menu can't be read as a dismissal. */
export function popReturningMenu<A>(
  win: BrowserWindow,
  buildItems: (
    pick: (action: A) => () => void,
    pickAfter: (ask: () => Promise<A | null>) => () => void,
  ) => MenuItemConstructorOptions[],
): Promise<A | null> {
  return new Promise((resolve) => {
    let acted = false
    const pick = (action: A) => () => {
      acted = true
      resolve(action)
    }
    const pickAfter = (ask: () => Promise<A | null>) => () => {
      acted = true
      void ask().then(resolve)
    }
    const template = buildItems(pick, pickAfter)
    // A model that gated every one of its items away has nothing to show; popping it would leave an
    // empty frame under the cursor.
    if (template.length === 0) {
      resolve(null)
      return
    }
    Menu.buildFromTemplate(template).popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}

/** The row shape every shared menu model emits. */
export interface ActionItem<A> {
  label: string
  action: A
  separatorBefore?: boolean
  /** Shown and refused rather than absent — for a row whose reason for being unavailable is worth
   *  stating. Absent reads as available. */
  disabled?: boolean
}

/** A destination tree as native submenus. A parent item cannot itself be clicked, so a container
 *  repeats its own name as its submenu's first row above a separator — the convention both the
 *  card's Move To ▸ and the trash's Restore ▸ need, stated once. `disabled` grays a destination
 *  that would be a no-op rather than hiding it, so the tree reads the same either way. */
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

