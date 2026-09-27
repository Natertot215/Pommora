import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import {
  type EntryPatch,
  TILE_KINDS,
  type TileEntry,
  type TilePick,
  type TileStyle,
  type ViewPick,
} from '@pommora/core/Tiles/tiles'
import { scaleRows } from './tileZoom'
import { ZOOM } from '@pommora/core/Settings/personalization'
import { type ActionItem, type PickItem, pickRows } from '@pommora/core/Actions/menuModel'
import { containerPickTree, type DefaultIcons } from '@pommora/core/Actions/pickTree'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { viewGlyph } from '@pommora/core/Views/viewIcon'

type TileMenuAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${number}`
  | `tile:pick:${number}`

export function menuPatch(action: string, entry: TileEntry): EntryPatch | null {
  if (action.startsWith('tile:zoom:')) {
    const factor = Number(action.slice('tile:zoom:'.length))
    return { zoom: factor === ZOOM.default ? null : factor }
  }
  if (action === 'tile:style:bordered') return { style: 'bordered' }
  if (action === 'tile:style:borderless') return { style: 'borderless' }
  if (action === 'tile:lock') return { locked: entry.locked ? null : true }
  return null
}

export const viewPickTree = (tree: NexusTree, icons: DefaultIcons): PickItem<ViewPick>[] =>
  containerPickTree(tree, icons, (c) => [
    ...(c.views ?? []).map((v) => ({
      label: v.name,
      icon: viewGlyph(v),
      pick: { source_id: c.id, view_id: v.id },
    })),
    { label: '+ Custom', pick: { source_id: c.id }, footer: true },
  ])

export function tileMenuItems({
  entry,
  pageItems,
  viewItems,
  pageInfo,
  containerLocked,
}: {
  entry: TileEntry
  pageItems: readonly PickItem<string>[]
  viewItems: readonly PickItem<ViewPick>[]
  pageInfo?: { title: string; icon: string }
  containerLocked: boolean
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] } {
  // Rows name an index into `picks` because a menu row can't carry a pick.
  const picks: TilePick[] = []
  const locked = (entry.locked ?? false) || containerLocked
  const pickAction = (pick: TilePick): TileMenuAction => {
    picks.push(pick)
    return `tile:pick:${picks.length - 1}`
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
          ? pickRows(pageItems, (value) => pickAction({ kind: 'page', value }))
          : pickRows(viewItems, (value) => pickAction({ kind: 'view', value })),
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
      submenu: scaleRows('tile:zoom:', entry.zoom ?? ZOOM.default),
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
