import type { ActionItem } from './menuModel'
import { iconLabel } from './toggleLabels'

type NexusIconAction = 'changeIcon' | 'addPhoto' | 'editPhoto' | 'resetIcon'

export type TitleMenuAction = 'rename' | 'editIcon' | 'toggleIcon'

export type BannerMenuAction = 'change' | 'edit' | 'remove'

type IconFavoriteMenuAction = 'toggle'

// The nexus holds an icon or a photo, so the one it holds leads as Edit and the other follows as Add. The seeded mark is neither: it offers both and restores nothing.
export function nexusIconMenuItems(opts: {
  hasPhoto: boolean
  hasGlyph: boolean
}): ActionItem<NexusIconAction>[] {
  const icon: ActionItem<NexusIconAction> = {
    label: opts.hasGlyph ? 'Edit Icon' : 'Add Icon',
    action: 'changeIcon',
  }
  const photo: ActionItem<NexusIconAction> = opts.hasPhoto
    ? { label: 'Edit Photo', action: 'editPhoto' }
    : { label: 'Add Photo', action: 'addPhoto' }
  const rows = opts.hasPhoto ? [photo, icon] : [icon, photo]
  if (!opts.hasPhoto && !opts.hasGlyph) return rows
  return [
    ...rows,
    {
      label: opts.hasPhoto ? 'Reset Photo' : 'Reset Icon',
      action: 'resetIcon',
      separatorBefore: true,
    },
  ]
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

export function titleMenuItems(
  opts: { toggleIcon?: boolean; iconHidden?: boolean; noEditIcon?: boolean } = {},
): ActionItem<TitleMenuAction>[] {
  return [
    { label: 'Rename', action: 'rename' },
    ...(opts.noEditIcon ? [] : [{ label: 'Edit Icon', action: 'editIcon' as const }]),
    ...(opts.toggleIcon
      ? [{ label: iconLabel(!opts.iconHidden), action: 'toggleIcon' as const }]
      : []),
  ]
}

export function iconFavoriteMenuItems(favorited: boolean): ActionItem<IconFavoriteMenuAction>[] {
  return [{ label: favorited ? 'Remove from Favorites' : 'Favorite', action: 'toggle' }]
}
