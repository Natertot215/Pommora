import { useState, type ReactNode } from 'react'
import { ChipsLeaf } from './ChipsLeaf'
import { MenuLeaf } from './MenuLeaf'
import { CalendarPicker } from '@renderer/design-system/components/CalendarPicker/CalendarPicker'
import {
  PickerMenu,
  PickerOption,
  MenuOption,
} from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { MenuSurface } from '@renderer/design-system/components/menu'
import { Chip } from '@renderer/Components/Chip'
import { condensedDate, formatDate } from '@renderer/Detail/Views/PropertyEditing/formatValue'

/** A button that pops the REAL component beneath it — the popup components demo as they
 *  actually behave, never as stubs. */
function PopupButton({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="ds-popup">
      <button
        type="button"
        className={`ds-switcher-btn${open ? ' is-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open ? <div className="ds-popup-panel">{children}</div> : null}
    </div>
  )
}

const PICKER_LABELS = [
  { label: 'Active', color: 'blue-1' },
  { label: 'On Hold', color: 'orange-3' },
  { label: 'Complete', color: 'green-3' },
] as const

// A fixed option set — what a popout is for, against the picker's user-authored values above.
const POPOUT_LABELS = ['As Link', 'As Title', 'Plain URL'] as const

/** ONE components page holds it all: the popup triggers, the chip system (with switches +
 *  checkboxes), and the menu primitives. Adding a component = a section or a PopupButton here. */
export function ComponentsLeaf(): React.JSX.Element {
  return (
    <div className="ds-leaf">
      <section className="ds-section">
        <h2>Popups</h2>
        <div className="ds-switcher">
          <PopupButton label="CalendarPicker">
            <CalendarPicker
              range
              timeFormat="twelveHour"
              formatDateValue={(iso, condensed) =>
                condensed
                  ? condensedDate(iso, 'short', condensed.withYear)
                  : formatDate(iso, 'full', 'none')
              }
            />
          </PopupButton>
          <PopupButton label="PickerMenu">
            <PickerMenu solid>
              {PICKER_LABELS.map((o, i) => (
                <PickerOption key={o.label} selected={i === 0} onClick={() => {}}>
                  <Chip color={o.color} label={o.label} shape="label" />
                </PickerOption>
              ))}
            </PickerMenu>
          </PopupButton>
          <PopupButton label="MenuOption rows">
            <PickerMenu solid>
              {POPOUT_LABELS.map((label, i) => (
                <MenuOption key={label} selected={i === 0} onClick={() => {}}>
                  {label}
                </MenuOption>
              ))}
            </PickerMenu>
          </PopupButton>
          <PopupButton label="MenuSurface">
            <MenuSurface>
              <span>The beaked dropdown chrome — frost clip + outline + beak.</span>
            </MenuSurface>
          </PopupButton>
        </div>
      </section>
      <ChipsLeaf />
      <MenuLeaf />
    </div>
  )
}
