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
    const pickRoot = (label: string, kind: 'embed' | 'source'): MenuItemConstructorOptions =>
      ctx.tree.length > 0
        ? { label, submenu: ctx.tree.map(node(kind)) }
        : { label, enabled: false }
    const items: MenuItemConstructorOptions[] =
      ctx.mode === 'create'
        ? [pickRoot('Embed Page', 'embed')]
        : [
            pickRoot('Page Source', 'source'),
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
