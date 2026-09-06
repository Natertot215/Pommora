// The action resolves BACK to the renderer, which performs the write and asks where one needs confirming.
import { Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

/** A click marks the menu acted before it resolves, so the close can't read as a dismissal. */
export function popReturningMenu<A>(
  win: BrowserWindow,
  buildItems: (pick: (action: A) => () => void) => MenuItemConstructorOptions[],
  /** Window DIPs; omitted pops at the cursor, wrong for a menu hanging from a clicked control. */
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
