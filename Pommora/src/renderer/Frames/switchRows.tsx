import type { SavedView } from '@shared/views'
import { Icon, type IconName } from '@renderer/DesignSystem/Symbols'
import type { MenuRow } from '@renderer/DesignSystem/Menus'
import { ICON } from './frames.css'

type SwitchKey = {
  [K in keyof SavedView]-?: SavedView[K] extends boolean | undefined ? K : never
}[keyof SavedView]

export type SwitchEntry = {
  icon: IconName
  label: string
  key: SwitchKey
  invert?: boolean
  defaultOn?: boolean
}

export const switchRows = (
  entries: SwitchEntry[],
  view: SavedView,
  save: (next: SavedView) => void,
): MenuRow[] =>
  entries.map((e) => {
    const stored = view[e.key] ?? e.defaultOn ?? false
    return {
      kind: 'item',
      icon: <Icon name={e.icon} size={ICON.rootEntry} />,
      label: e.label,
      trailing: {
        kind: 'switch',
        checked: e.invert ? !stored : stored,
        ariaLabel: e.label,
        onChange: (next) => save({ ...view, [e.key]: e.invert ? !next : next }),
      },
    }
  })
