import type { ZoomOption } from './gripMenu'
// The tile menu as a model: the in-app pane and the native menu both draw from it.

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

/** Rows name an index into this list because a menu row can't carry a view pick's three fields. */
export type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }

export interface TileMenuContext {
  entry: TileEntry
  pageInfo?: { title: string }
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  zoomSteps: readonly ZoomOption[]
  currentFactor: number
  locked: boolean
  containerLocked: boolean
}

export interface TileMenuModel {
  items: ActionItem<TileAction>[]
  picks: TilePick[]
}

export function tileMenuModel(ctx: TileMenuContext): TileMenuModel {
  const picks: TilePick[] = []
  const { locked, containerLocked, entry, pageInfo } = ctx

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

  const borderless = entry.style === 'borderless'
  const items: ActionItem<TileAction>[] = [
    ...(pageInfo ? [{ label: pageInfo.title, action: 'tile:open' as const, disabled: true }] : []),
    // A row with no source is shown and refused rather than dropped.
    ...TILE_KINDS[entry.type].menuRows.map(({ label, source }): ActionItem<TileAction> => {
      const rows =
        source === 'pages'
          ? drill(ctx.pageItems, (value) => ({ kind: 'page', value }))
          : drill(ctx.viewItems, (value) => ({ kind: 'view', value }))
      const off = locked || rows.length === 0
      return { label, action: 'tile:open', disabled: off, ...(off ? {} : { submenu: rows }) }
    }),
    {
      label: 'Style',
      action: 'tile:open',
      disabled: locked,
      submenu: [
        { label: 'Bordered', action: 'tile:style:bordered', checked: !borderless },
        { label: 'Borderless', action: 'tile:style:borderless', checked: borderless },
      ],
    },
    {
      label: 'Scale',
      action: 'tile:open',
      disabled: locked,
      submenu: ctx.zoomSteps.map((st) => ({
        label: st.label,
        action: `tile:zoom:${st.factor}` as const,
        checked: st.factor === ctx.currentFactor,
      })),
    },
    { label: 'Duplicate', action: 'tile:duplicate', separatorBefore: true, disabled: locked },
    { label: 'Delete', action: 'tile:delete', disabled: locked },
    {
      label: containerLocked ? 'Locked' : lockLabel(locked),
      action: 'tile:lock',
      separatorBefore: true,
      disabled: containerLocked,
    },
  ]

  return { items, picks }
}
