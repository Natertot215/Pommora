import { lockLabel } from '../Actions/toggleLabels'
import {
  type EntryPatch,
  type PickKind,
  TILE_KINDS,
  type TileEntry,
  type TilePick,
  type TileStyle,
} from './tiles'
import { scaleRows } from './tileZoom'
import { type Personalization, ZOOM } from '../Settings/personalization'
import { type ActionItem, type PickItem, pickRows } from '../Actions/menuModel'
import { containerPickTree, pagePickTree } from '../Actions/pickTree'
import type { NexusTree } from '../Nexus/tree'
import { viewGlyph } from '../Views/viewIcon'

type PickAction = `tile:pick:${number}`

type TileMenuAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${number}`
  | PickAction

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

type PickTrees = { [K in PickKind]: readonly PickItem<Extract<TilePick, { kind: K }>['value']>[] }
type PickTree = <K extends PickKind>(kind: K) => PickTrees[K]

const PICK_TREES: {
  [K in PickKind]: (tree: NexusTree, icons: Personalization['defaultIcons']) => PickTrees[K]
} = {
  page: (tree, icons) => pagePickTree(tree, icons, (p) => p.id),
  view: (tree, icons) =>
    containerPickTree(tree, icons, (c) => [
      ...(c.views ?? []).map((v) => ({
        label: v.name,
        icon: viewGlyph(v),
        pick: { source_id: c.id, view_id: v.id },
      })),
      { label: '+ Custom', pick: { source_id: c.id }, footer: true },
    ]),
}

/** A kind's tree is built when a menu row first asks for it, once per menu. */
export function pickTreesOf(tree: NexusTree, icons: Personalization['defaultIcons']): PickTree {
  const built: Partial<PickTrees> = {}
  return (kind) => (built[kind] ??= PICK_TREES[kind](tree, icons))
}

// Rows name an index into `picks` because a menu row can't carry a pick; a row with no source is shown and refused rather than dropped.
function linkRows(
  rows: ReadonlyArray<{ label: string; to: PickKind }>,
  pickTree: PickTree,
  locked: boolean,
): { items: ActionItem<PickAction>[]; picks: TilePick[] } {
  const picks: TilePick[] = []
  const rowsTo = <K extends PickKind>(to: K) =>
    pickRows(pickTree(to), (value): PickAction => {
      picks.push({ kind: to, value } as TilePick)
      return `tile:pick:${picks.length - 1}`
    })
  const items = rows.map(({ label, to }) => ({
    label,
    icon: 'link',
    submenu: locked ? [] : rowsTo(to),
  }))
  return { items, picks }
}

export const pickOf = (action: string, picks: readonly TilePick[]): TilePick | undefined =>
  action.startsWith('tile:pick:') ? picks[Number(action.slice('tile:pick:'.length))] : undefined

/** What a ghost tile's click offers: a blank Markdown Tile, or one made already linked through the rows a Markdown Tile's own menu links by. */
export function insertMenuItems(
  pickTree: PickTree,
  pageIcon: string,
): { items: ActionItem<'tile:new' | PickAction>[]; picks: TilePick[] } {
  const links = linkRows(TILE_KINDS.markdown.menuRows, pickTree, false)
  return {
    items: [{ label: 'New Page', icon: pageIcon, action: 'tile:new' }, ...links.items],
    picks: links.picks,
  }
}

export function tileMenuItems({
  entry,
  pickTree,
  pageInfo,
  boardLocked,
}: {
  entry: TileEntry | undefined
  pickTree: PickTree
  pageInfo?: { title: string; icon: string }
  boardLocked: boolean
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] } {
  const locked = (entry?.locked ?? false) || boardLocked
  const deleteRow = { label: 'Delete', icon: 'x', action: 'tile:delete' as const, disabled: locked }
  // A box with no entry this build can draw offers Delete alone, so it can still be removed.
  if (!entry) return { items: [deleteRow], picks: [] }
  const links = linkRows(TILE_KINDS[entry.type].menuRows, pickTree, locked)
  const borderless = entry.style === 'borderless'
  const items: ActionItem<TileMenuAction>[] = [
    ...(pageInfo
      ? [{ label: pageInfo.title, icon: pageInfo.icon, action: 'tile:open' as const }]
      : []),
    ...links.items,
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
    deleteRow,
    {
      label: boardLocked ? 'Locked' : lockLabel(locked),
      icon: locked ? 'locked' : 'lock-outline',
      action: 'tile:lock',
      separatorBefore: true,
      disabled: boardLocked,
      stay: true,
    },
  ]
  return { items, picks: links.picks }
}
