import { type ActionItem, joinGroups } from './menuModel'
import { iconLabel } from './toggleLabels'

export type NexusIconAction = 'editIcon' | 'addPhoto' | 'editPhoto' | 'resetIcon'

export type TitleMenuAction = 'rename' | 'editIcon' | 'toggleIcon'

export type BannerMenuAction = 'change' | 'edit' | 'remove'

type IconFavoriteMenuAction = 'toggle'

interface NexusIconHolds {
  hasPhoto: boolean
  hasGlyph: boolean
}

// The nexus holds an icon or a photo, so the one it holds leads as Edit and the other follows as Add. The seeded mark is neither: it offers both and restores nothing.
function nexusIconRows(opts: NexusIconHolds): {
  edits: ActionItem<NexusIconAction>[]
  reset: ActionItem<NexusIconAction>[]
} {
  const icon: ActionItem<NexusIconAction> = {
    label: opts.hasGlyph ? 'Edit Icon' : 'Add Icon',
    action: 'editIcon',
  }
  const photo: ActionItem<NexusIconAction> = opts.hasPhoto
    ? { label: 'Edit Photo', action: 'editPhoto' }
    : { label: 'Add Photo', action: 'addPhoto' }
  return {
    edits: opts.hasPhoto ? [photo, icon] : [icon, photo],
    reset:
      opts.hasPhoto || opts.hasGlyph
        ? [{ label: opts.hasPhoto ? 'Reset Photo' : 'Reset Icon', action: 'resetIcon' }]
        : [],
  }
}

export function nexusIconMenuItems(opts: NexusIconHolds): ActionItem<NexusIconAction>[] {
  const { edits, reset } = nexusIconRows(opts)
  return joinGroups([edits, reset])
}

export function nexusTitleMenuItems(
  opts: NexusIconHolds & { iconHidden: boolean },
): ActionItem<TitleMenuAction | NexusIconAction>[] {
  const { edits, reset } = nexusIconRows(opts)
  return joinGroups([titleMenuItems({ iconHidden: opts.iconHidden, iconRows: edits }), reset])
}

export function bannerMenuItems(
  opts: { noRemove?: boolean; noun?: string; add?: boolean } = {},
): ActionItem<BannerMenuAction>[] {
  const noun = opts.noun ?? 'Banner'
  return opts.add
    ? [{ label: `Add ${noun}`, action: 'change' }]
    : [
        { label: `Edit ${noun}`, action: 'edit' },
        { label: `Change ${noun}`, action: 'change' },
        ...(opts.noRemove ? [] : [{ label: `Remove ${noun}`, action: 'remove' as const }]),
      ]
}

export function titleMenuItems<A = never>(
  opts: { iconHidden?: boolean; iconRows?: ActionItem<A>[] } = {},
): ActionItem<TitleMenuAction | A>[] {
  return [
    { label: 'Rename', action: 'rename' },
    ...(opts.iconRows ?? [{ label: 'Edit Icon', action: 'editIcon' as const }]),
    ...(opts.iconHidden === undefined
      ? []
      : [{ label: iconLabel(!opts.iconHidden), action: 'toggleIcon' as const }]),
  ]
}

export function withSearchRow<A>(rows: ActionItem<A>[]): ActionItem<A | 'search'>[] {
  return joinGroups<A | 'search'>([[{ label: 'Search', action: 'search' }], rows])
}

export function iconFavoriteMenuItems(
  isIconFavorite: boolean,
): ActionItem<IconFavoriteMenuAction>[] {
  return [
    {
      label: isIconFavorite ? 'Remove from Icon Favorites' : 'Add to Icon Favorites',
      action: 'toggle',
    },
  ]
}
