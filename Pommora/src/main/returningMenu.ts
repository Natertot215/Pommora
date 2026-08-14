// The returning-picker menu plumbing: pop a native menu, resolve the chosen action BACK to the
// renderer (which performs the write), and resolve null when the menu is dismissed. The single
// home for the `let acted` / popup-callback dance every returning menu needs.
import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

/** `buildItems` receives `pick`, a factory turning an action into a click handler that resolves it. */
export function popReturningMenu<A>(
  win: BrowserWindow,
  buildItems: (pick: (action: A) => () => void) => MenuItemConstructorOptions[],
): Promise<A | null> {
  return new Promise((resolve) => {
    let acted = false
    const pick = (action: A) => () => {
      acted = true
      resolve(action)
    }
    Menu.buildFromTemplate(buildItems(pick)).popup({
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
}

/** A model's rows as a native template, with `separatorBefore` expanded into real separator rows.
 *  `click` is left to the caller because a returning menu resolves the action back to the renderer
 *  while an owning menu runs it in place. */
export function menuTemplate<A>(
  items: readonly ActionItem<A>[],
  click: (action: A) => () => void,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []
  for (const item of items) {
    if (item.separatorBefore) template.push({ type: 'separator' })
    template.push({ label: item.label, click: click(item.action) })
  }
  return template
}

/** A menu that is nothing but its model's rows: pop them, resolve the pick. */
export function popModelMenu<A>(
  win: BrowserWindow,
  items: readonly ActionItem<A>[],
): Promise<A | null> {
  return popReturningMenu<A>(win, (pick) => menuTemplate(items, pick))
}
