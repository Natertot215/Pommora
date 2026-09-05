import type { ZoomOption } from './gripMenu'
// The surface tile's menu as a model — the same offering the in-app pane draws, in the shape an OS
// menu can be built from. Which one a person sees is a preference; what the menu OFFERS is stated
// once, here.
//
// A native menu draws no glyphs and pins no footer, so the icons and the footer flag the drill items
// carry are simply not read: the rows, their order and their nesting survive, which is what the menu
// actually is.

import {
  type DrillPickItem,
  type PagePickerItem,
  TILE_KINDS,
  type TileEntry,
  type TileStyle,
  type ViewPick,
  type ViewPickerItem,
} from './tiles'
import type { ActionItem } from './menuModel'
import { lockLabel } from './toggleLabels'

export type TileAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${string}`
  | `tile:pick:${number}`

/** What a `tile:pick:<n>` resolves to. The drill trees hold values a menu row can't carry — a view
 *  pick is three fields — so the rows name an index into this list and the caller reads it back.
 *  Built in the same pass as the rows, so the two can never fall out of step. */
export type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }

export interface TileMenuContext {
  entry: TileEntry
  /** The source page's identity, for a page tile. Its title heads the menu, inert. */
  pageInfo?: { title: string }
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  zoomSteps: readonly ZoomOption[]
  currentFactor: number
  /** The tile's own lock, or the board's — every act is refused either way, and the menu still
   *  opens: what it offers is worth reading even when none of it can be taken. */
  locked: boolean
  /** A board-level lock, which the tile can't undo, so the Lock row goes with it. */
  containerLocked: boolean
}

export interface TileMenuModel {
  items: ActionItem<TileAction>[]
  picks: TilePick[]
}

export function tileMenuModel(ctx: TileMenuContext): TileMenuModel {
  const picks: TilePick[] = []
  const { locked, containerLocked, entry } = ctx

  const drill = <T>(
    nodes: readonly DrillPickItem<T>[],
    wrap: (value: T) => TilePick,
  ): ActionItem<TileAction>[] =>
    nodes.map((n) => {
      if (n.submenu) {
        const rows = drill(n.submenu, wrap)
        // A branch with nothing under it is a leaf that can't be taken, not an empty branch — an
        // empty submenu opens onto blank space instead of saying there is nothing to pick.
        return rows.length > 0
          ? { label: n.label, action: 'tile:open' as const, submenu: rows }
          : { label: n.label, action: 'tile:open' as const, disabled: true }
      }
      const value = n.pick
      if (value === undefined) return { label: n.label, action: 'tile:open', disabled: true }
      picks.push(wrap(value))
      return { label: n.label, action: `tile:pick:${picks.length - 1}` as const }
    })

  const items: ActionItem<TileAction>[] = []

  // The page's own name, inert — the in-app menu's title field reads as a link, and an OS menu has
  // no equivalent, so what survives is the identity rather than the affordance.
  if (ctx.pageInfo) items.push({ label: ctx.pageInfo.title, action: 'tile:open', disabled: true })

  const link = (label: string, rows: ActionItem<TileAction>[]): void => {
    const off = locked || rows.length === 0
    items.push({ label, action: 'tile:open', disabled: off, ...(off ? {} : { submenu: rows }) })
  }
  // A row with no source is shown and refused rather than dropped — the menu reads the same
  // whichever tile it belongs to.
  for (const row of TILE_KINDS[entry.type].menuRows)
    link(
      row.label,
      row.source === 'pages'
        ? drill(ctx.pageItems, (value) => ({ kind: 'page', value }))
        : row.source === 'views'
          ? drill(ctx.viewItems, (value) => ({ kind: 'view', value }))
          : [],
    )

  const style: TileStyle = entry.style === 'borderless' ? 'borderless' : 'bordered'
  items.push({
    label: 'Style',
    action: 'tile:open',
    disabled: locked,
    submenu: [
      { label: 'Bordered', action: 'tile:style:bordered', checked: style === 'bordered' },
      { label: 'Borderless', action: 'tile:style:borderless', checked: style === 'borderless' },
    ],
  })

  items.push({
    label: 'Scale',
    action: 'tile:open',
    disabled: locked,
    submenu: ctx.zoomSteps.map((st) => ({
      label: st.label,
      action: `tile:zoom:${st.factor}` as const,
      checked: st.factor === ctx.currentFactor,
    })),
  })

  items.push({
    label: 'Duplicate',
    action: 'tile:duplicate',
    separatorBefore: true,
    disabled: locked,
  })
  items.push({ label: 'Delete', action: 'tile:delete', disabled: locked })

  items.push({
    label: containerLocked ? 'Locked' : lockLabel(locked),
    action: 'tile:lock',
    separatorBefore: true,
    disabled: containerLocked,
  })

  return { items, picks }
}
