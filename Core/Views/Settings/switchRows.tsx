import { type SavedView, type ViewFlag, viewOption } from '@pommora/core/Views/views'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import type { MenuRow } from '@pommora/uix/Menus'
import { ICON } from '@pommora/uix/Menus/frames.css'

export type SwitchEntry = {
  icon: IconName
  label: string
  key: ViewFlag
  invert?: boolean
}

export const switchRows = (
  entries: SwitchEntry[],
  view: SavedView,
  save: (next: SavedView) => void,
): MenuRow[] =>
  entries.map((e) => {
    const on = viewOption(view, e.key)
    return {
      kind: 'item',
      icon: <Icon name={e.icon} size={ICON.rootEntry} />,
      label: e.label,
      trailing: {
        kind: 'switch',
        checked: e.invert ? !on : on,
        ariaLabel: e.label,
        onChange: (next) => save({ ...view, [e.key]: e.invert ? !next : next }),
      },
    }
  })
