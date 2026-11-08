import { type SavedView, viewOption } from '../views'
import type { SwitchEntry } from '../Host/viewKinds'
import { Icon } from '@pommora/uix/Symbols'
import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
import { ICON } from '@pommora/uix/Menus/frames.css'

export const switchRows = (
  entries: SwitchEntry[],
  view: SavedView,
  save: (patch: Partial<SavedView>) => void,
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
        onChange: (next) => save({ [e.key]: e.invert ? !next : next }),
      },
    }
  })
