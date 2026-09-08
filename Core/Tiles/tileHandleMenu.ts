import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import {
  type DrillPickItem,
  type PagePickerItem,
  TILE_KINDS,
  type TileEntry,
  type TileStyle,
  type ViewPick,
  type ViewPickerItem,
} from '@pommora/core/Tiles/tiles'
import { ZOOM_STEPS, zoomStep } from './tileZoom'
import { type ActionItem, afterSeparator } from '@pommora/core/Actions/menuModel'

type TileMenuAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${number}`
  | `tile:pick:${number}`

// Rows name an index into `picks` because a menu row can't carry a view pick's three fields.
type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }

export function tileMenuItems({
  entry,
  pageItems,
  viewItems,
  pageInfo,
  containerLocked,
}: {
  entry: TileEntry
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  pageInfo?: { title: string; icon: string }
  containerLocked: boolean
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] } {
  const picks: TilePick[] = []
  const locked = (entry.locked ?? false) || containerLocked
  const drill = <T>(
    nodes: readonly DrillPickItem<T>[],
    wrap: (value: T) => TilePick,
  ): ActionItem<TileMenuAction>[] => {
    const row = (n: DrillPickItem<T>): ActionItem<TileMenuAction> => {
      const base = { label: n.label, icon: n.icon, action: 'tile:open' as const }
      if (n.submenu) {
        const rows = drill(n.submenu, wrap)
        // An empty submenu opens onto blank space instead of saying there is nothing to pick.
        return rows.length > 0 ? { ...base, submenu: rows } : { ...base, disabled: true }
      }
      if (n.pick === undefined) return { ...base, disabled: true }
      picks.push(wrap(n.pick))
      return { label: n.label, icon: n.icon, action: `tile:pick:${picks.length - 1}` as const }
    }
    const body = nodes.filter((n) => !n.footer).map(row)
    const footer = nodes.filter((n) => n.footer).map(row)
    return [...body, ...(body.length ? afterSeparator(footer) : footer)]
  }
  const borderless = entry.style === 'borderless'
  const currentFactor = zoomStep(entry.zoom).factor
  const items: ActionItem<TileMenuAction>[] = [
    ...(pageInfo
      ? [{ label: pageInfo.title, icon: pageInfo.icon, action: 'tile:open' as const }]
      : []),
    // A row with no source is shown and refused rather than dropped.
    ...TILE_KINDS[entry.type].menuRows.map(({ label, source }): ActionItem<TileMenuAction> => {
      const rows =
        source === 'pages'
          ? drill(pageItems, (value) => ({ kind: 'page', value }))
          : drill(viewItems, (value) => ({ kind: 'view', value }))
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
      submenu: ZOOM_STEPS.map((st) => ({
        label: st.label,
        action: `tile:zoom:${st.factor}` as const,
        checked: st.factor === currentFactor,
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
