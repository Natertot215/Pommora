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
import { scaleRows, zoomStep } from './tileZoom'
import { type ActionItem, joinGroups } from '@pommora/core/Actions/menuModel'

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
      if (n.pick === undefined)
        return { label: n.label, icon: n.icon, submenu: drill(n.submenu ?? [], wrap) }
      picks.push(wrap(n.pick))
      return { label: n.label, icon: n.icon, action: `tile:pick:${picks.length - 1}` as const }
    }
    return joinGroups([
      nodes.filter((n) => !n.footer).map(row),
      nodes.filter((n) => n.footer).map(row),
    ])
  }
  const borderless = entry.style === 'borderless'
  const items: ActionItem<TileMenuAction>[] = [
    ...(pageInfo
      ? [{ label: pageInfo.title, icon: pageInfo.icon, action: 'tile:open' as const }]
      : []),
    // A row with no source is shown and refused rather than dropped.
    ...TILE_KINDS[entry.type].menuRows.map(({ label, source }) => ({
      label,
      icon: 'link',
      submenu: locked
        ? []
        : source === 'pages'
          ? drill(pageItems, (value) => ({ kind: 'page', value }))
          : drill(viewItems, (value) => ({ kind: 'view', value })),
    })),
    {
      label: 'Style',
      icon: 'palette',
      disabled: locked,
      submenu: [
        { label: 'Bordered', action: 'tile:style:bordered', checked: !borderless, stay: true },
        { label: 'Borderless', action: 'tile:style:borderless', checked: borderless, stay: true },
      ],
    },
    {
      label: 'Scale',
      icon: 'scaling',
      disabled: locked,
      submenu: scaleRows('tile:zoom:', zoomStep(entry.zoom)),
    },
    {
      label: 'Duplicate',
      icon: 'copy',
      action: 'tile:duplicate',
      separatorBefore: true,
      disabled: locked,
    },
    { label: 'Delete', icon: 'x', action: 'tile:delete', disabled: locked },
    {
      label: containerLocked ? 'Locked' : lockLabel(locked),
      icon: locked ? 'locked' : 'lock-outline',
      action: 'tile:lock',
      separatorBefore: true,
      disabled: containerLocked,
      stay: true,
    },
  ]
  return { items, picks }
}
