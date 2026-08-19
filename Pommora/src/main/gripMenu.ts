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

// Paragraph plus H1–H5, matching the editor's Format › Heading menu (H6 exists but stays off the picker).
const HEADING_SIZES: [number, string][] = [
  [0, 'Paragraph'],
  [1, 'Heading 1'],
  [2, 'Heading 2'],
  [3, 'Heading 3'],
  [4, 'Heading 4'],
  [5, 'Heading 5'],
]

export function popGripMenu(
  win: BrowserWindow,
  ctx: GripMenuContext,
): Promise<GripMenuAction | null> {
  return popReturningMenu<GripMenuAction>(win, (pick) => {
    if (ctx.kind === 'heading')
      return [
        { label: 'Rename', click: pick({ action: 'rename' }) },
        {
          label: 'Size',
          submenu: HEADING_SIZES.map(([level, label]) => ({
            label,
            type: 'radio' as const,
            checked: ctx.level === level,
            click: pick({ action: 'size', level }),
          })),
        },
        { type: 'separator' as const },
        { label: 'Delete', click: pick({ action: 'delete' }) },
      ]

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
        case 'webpage':
          return [{ label: 'Edit Link', click: pick({ action: 'editLink' }) }]
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
