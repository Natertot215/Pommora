// The embed grip's native menu — "Embed Page ▸" on an ordinary block's grip, "Page Source ▸" +
// "Delete Embed" on an embed tile's. The tree crosses IPC in the ctx; the pick resolves the ask.
import { type BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import type { EmbedMenuAction, EmbedMenuContext, EmbedPickNode } from '@shared/embedMenu'

export function popEmbedMenu(
  win: BrowserWindow,
  ctx: EmbedMenuContext,
): Promise<EmbedMenuAction | null> {
  return new Promise((resolve) => {
    let acted = false
    const pick = (a: EmbedMenuAction) => () => {
      acted = true
      resolve(a)
    }
    const node =
      (kind: 'embed' | 'source') =>
      (n: EmbedPickNode): MenuItemConstructorOptions =>
        n.children
          ? { label: n.label, submenu: n.children.map(node(kind)) }
          : { label: n.label, click: pick({ action: kind, title: n.title ?? n.label }) }
    const items: MenuItemConstructorOptions[] =
      ctx.mode === 'create'
        ? [
            ctx.tree.length > 0
              ? { label: 'Embed Page', submenu: ctx.tree.map(node('embed')) }
              : { label: 'Embed Page', enabled: false },
          ]
        : [
            ctx.tree.length > 0
              ? { label: 'Page Source', submenu: ctx.tree.map(node('source')) }
              : { label: 'Page Source', enabled: false },
            { type: 'separator' },
            { label: 'Delete Embed', click: pick({ action: 'delete' }) },
          ]
    const menu = Menu.buildFromTemplate(items)
    menu.popup({
      window: win,
      callback: () => {
        if (!acted) resolve(null)
      },
    })
  })
}
