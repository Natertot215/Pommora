// Cross-process contract for the table grip's right-click menu. The renderer sends where the click
// landed; main pops the native menu and resolves the chosen action (null if dismissed); the renderer
// applies it. No fs, no React — both sides import this.

import type { ActionItem } from './menuModel'
import { COLUMN_ALIGNS, type ColumnAlign } from './views'

export type TableMenuKind = 'column' | 'row' | 'header'

// `index` is the column index (kind 'column') or the visual row index (kind 'row'; 0 = header → kind
// 'header'). `align` carries the column's current alignment so the Align radio renders checked.
// `headingColumn` carries whether THIS table already has a heading column so the toggle (shown only on
// the first column) renders checked.
export interface TableMenuContext {
  kind: TableMenuKind
  index: number
  align?: ColumnAlign | null
  headingColumn?: boolean
}

export type TableMenuAction =
  | 'align:left'
  | 'align:center'
  | 'align:right'
  | 'col:copy'
  | 'col:insert-left'
  | 'col:insert-right'
  | 'col:clear'
  | 'col:delete'
  | 'col:toggle-heading'
  | 'row:copy'
  | 'row:insert-above'
  | 'row:insert-below'
  | 'row:clear'
  | 'row:delete'
  | 'table:copy-outline'
  | 'table:copy-content'
  | 'table:clear-header'
  | 'table:clear'
  | 'table:delete'

/** The rows a table grip's menu offers, by where the click landed. The Align row leads a nested
 *  list — one row per alignment, the current one checked — and the heading-column toggle is offered
 *  on the first column alone, since only it can read as the header. The heading row's grip speaks
 *  for the whole table, so its Clear Row means that row's own cells. */
export function tableMenuItems(ctx: TableMenuContext): ActionItem<TableMenuAction>[] {
  if (ctx.kind === 'header')
    return [
      { label: 'Copy Outline', action: 'table:copy-outline' },
      { label: 'Copy Content', action: 'table:copy-content' },
      { label: 'Clear Row', action: 'table:clear-header', separatorBefore: true },
      { label: 'Clear Table', action: 'table:clear' },
      { label: 'Delete', action: 'table:delete', separatorBefore: true },
    ]
  if (ctx.kind === 'row')
    return [
      { label: 'Copy', action: 'row:copy' },
      { label: 'Insert Row Above', action: 'row:insert-above', separatorBefore: true },
      { label: 'Insert Row Below', action: 'row:insert-below' },
      { label: 'Clear', action: 'row:clear', separatorBefore: true },
      { label: 'Delete', action: 'row:delete' },
    ]
  return [
    { label: 'Copy', action: 'col:copy' },
    {
      separatorBefore: true,
      label: 'Align',
      action: 'align:left',
      submenu: COLUMN_ALIGNS.map((a) => ({
        label: `${a[0].toUpperCase()}${a.slice(1)}`,
        action: `align:${a}` as TableMenuAction,
        checked: ctx.align === a,
      })),
    },
    // The first column can read like the header row — a Pommora-only visual; the .md stays a plain
    // table. The label states the state it is in rather than only what pressing it does.
    ...(ctx.index === 0
      ? [
          {
            label: ctx.headingColumn ? 'Heading Column' : 'Make Heading Column',
            action: 'col:toggle-heading' as const,
            checked: ctx.headingColumn ?? false,
            separatorBefore: true,
          },
        ]
      : []),
    {
      label: 'Insert Column Left',
      action: 'col:insert-left',
      separatorBefore: ctx.index !== 0,
    },
    { label: 'Insert Column Right', action: 'col:insert-right' },
    { label: 'Clear', action: 'col:clear', separatorBefore: true },
    { label: 'Delete', action: 'col:delete' },
  ]
}
