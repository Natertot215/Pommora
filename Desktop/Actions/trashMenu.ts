import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {
  TRASH_DATE_FORMATS,
  type TrashColumnAction,
  type TrashColumnContext,
  type TrashMenuAction,
  type TrashMenuContext,
  trashMenuLabels,
} from '@pommora/core/Actions/trashMenu'
import { destinationNodes, popReturningMenu } from './returningMenu'

/** The nesting primitive, not the flat helper: a row whose home is gone turns Restore into a question of where. */
export function popTrashMenu(
  win: BrowserWindow,
  ctx: TrashMenuContext,
): Promise<TrashMenuAction | null> {
  const label = trashMenuLabels(ctx.batch)
  return popReturningMenu<TrashMenuAction>(win, (pick) => {
    const items: MenuItemConstructorOptions[] = []
    if (ctx.destinations && ctx.destinationKind) {
      const kind = ctx.destinationKind
      items.push({
        label: label.restore,
        // Nowhere to put it is not nothing to do — the row stays and reads disabled.
        enabled: ctx.destinations.length > 0,
        submenu: destinationNodes(ctx.destinations, (t) =>
          pick({ kind: 'restoreTo', destination: { kind, id: t.id } }),
        ),
      })
    } else {
      items.push({
        label: label.restore,
        click: pick({ kind: ctx.batch ? 'restoreAll' : 'restore' }),
      })
    }
    items.push({ type: 'separator' })
    items.push({ label: label.delete, click: pick({ kind: ctx.batch ? 'deleteAll' : 'delete' }) })
    return items
  })
}

/** The format rows are a radio set: picking the one in force is a no-op the menu shows rather than hides. */
export function popTrashColumnMenu(
  win: BrowserWindow,
  ctx: TrashColumnContext,
): Promise<TrashColumnAction | null> {
  return popReturningMenu<TrashColumnAction>(win, (pick) => [
    {
      label: 'Format',
      submenu: TRASH_DATE_FORMATS.map((f) => ({
        label: f.label,
        type: 'radio' as const,
        checked: f.value === ctx.format,
        click: pick({ kind: 'format', format: f.value }),
      })),
    },
    { label: ctx.timeShown ? 'Hide Time' : 'Show Time', click: pick({ kind: 'toggleTime' }) },
  ])
}
