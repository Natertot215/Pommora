// The block grip's native menu: Delete on every kind, with that kind's own arm above it — "Page
// Source ▸" on an embed tile, "Type ▸" on a list. The pick tree crosses IPC in the ctx.
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  type GripMenuAction,
  type GripMenuContext,
  HEADING_LEVELS,
  LIST_KIND_LABELS,
  type PickNode,
} from '@shared/gripMenu'
import { popReturningMenu } from './returningMenu'

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
          submenu: HEADING_LEVELS.map(({ level, label }) => ({
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
        case 'embed': {
          const sourceItem: MenuItemConstructorOptions =
            ctx.tree.length > 0
              ? { label: 'Page Source', submenu: ctx.tree.map(source) }
              : { label: 'Page Source', enabled: false }
          // An unresolved token has no tile to scale — the arm waits for the claim.
          const scaleItem: MenuItemConstructorOptions =
            ctx.zoom === null
              ? { label: 'Scale', enabled: false }
              : {
                  label: 'Scale',
                  submenu: ctx.zoomSteps.map(({ label, factor }) => ({
                    label,
                    type: 'radio' as const,
                    checked: factor === ctx.zoom,
                    click: pick({ action: 'zoom', factor }),
                  })),
                }
          return [sourceItem, scaleItem]
        }
        case 'webpage':
          return [{ label: 'Edit Link', click: pick({ action: 'editLink' }) }]
        case 'list':
          return [
            {
              label: 'Type',
              submenu: LIST_KIND_LABELS.map(({ kind, label }) => ({
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
