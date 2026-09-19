import type { ActionItem } from './menuModel'
import { iconLabel } from './toggleLabels'

type NexusIconAction = 'changeIcon' | 'addPhoto' | 'editPhoto' | 'resetIcon'

export type TitleMenuAction = 'rename' | 'editIcon' | 'toggleIcon'

type BannerMenuAction = 'change' | 'edit' | 'remove'

type IconFavoriteMenuAction = 'toggle'

export function nexusIconMenuItems(opts: {
  hasPhoto: boolean
  hasGlyph: boolean
}): ActionItem<NexusIconAction>[] {
  return [
    { label: 'Edit Icon', action: 'changeIcon' },
    ...(opts.hasPhoto ? [{ label: 'Edit Photo', action: 'editPhoto' as const }] : []),
    { label: opts.hasPhoto ? 'Change Photo' : 'Add Photo', action: 'addPhoto' },
    ...(opts.hasPhoto || opts.hasGlyph
      ? [
          {
            label: opts.hasPhoto ? 'Reset Photo' : 'Reset Icon',
            action: 'resetIcon' as const,
            separatorBefore: true,
          },
        ]
      : []),
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
