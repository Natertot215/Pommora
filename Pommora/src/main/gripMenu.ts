// The block grip's native menu: Delete on every kind, with that kind's own arm above it — "Page
// Source ▸" on an embed tile, "Type ▸" on a list. The pick tree crosses IPC in the ctx.
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import type { GripMenuAction, GripMenuContext, ListKind, PickNode } from '@shared/gripMenu'
import { popReturningMenu } from './returningMenu'

const LIST_TYPES: [ListKind, string][] = [
  ['ordered', 'Numbered'],
  ['bullet', 'Bulleted'],
  ['checkbox', 'Checklist'],
  ['arrow', 'Arrowed'],
]

export function popGripMenu(
  win: BrowserWindow,
  ctx: GripMenuContext,
): Promise<GripMenuAction | null> {
  return popReturningMenu<GripMenuAction>(win, (pick) => {
    const source = (n: PickNode): MenuItemConstructorOptions =>
      n.children
        ? { label: n.label, submenu: n.children.map(source) }
        : { label: n.label, click: pick({ action: 'source', title: n.title ?? n.label }) }

    const own = (): MenuItemConstructorOptions[] => {
      switch (ctx.kind) {
        case 'embed':
          return ctx.tree.length > 0
            ? [{ label: 'Page Source', submenu: ctx.tree.map(source) }]
            : [{ label: 'Page Source', enabled: false }]
        case 'list':
          return [
            {
              label: 'Type',
              submenu: LIST_TYPES.map(([kind, label]) => ({
                label,
                type: 'checkbox' as const,
                checked: ctx.current === kind,
                click: pick({ action: 'listKind', kind }),
              })),
            },
          ]
        case 'plain':
          return []
      }
    }

    const above = own()
    return [
      ...above,
      ...(above.length > 0 ? [{ type: 'separator' as const }] : []),
      { label: 'Delete', click: pick({ action: 'delete' }) },
    ]
  })
}
