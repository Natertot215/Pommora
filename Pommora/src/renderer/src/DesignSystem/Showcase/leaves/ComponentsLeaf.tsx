import { useState, type ReactNode } from 'react'
import { FieldsLeaf } from './FieldsLeaf'
import { LabelsLeaf } from './LabelsLeaf'
import { MenuLeaf } from './MenuLeaf'
import { CalendarPicker } from '../../Components/Pickers/CalendarPicker/CalendarPicker'
import { PickerMenu, PickerOption } from '../../Components/Pickers/PickerMenu/PickerMenu'
import { MenuSurface } from '../../Components/Menu'
import { condensedDate, formatDate } from '@renderer/Detail/Views/PropertyEditing/formatValue'
import { Label } from '../../Labels'

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

const POPOUT_LABELS = ['As Link', 'As Title', 'Plain URL'] as const

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
                  <Label color={o.color} text={o.label} shape="tag" />
                </PickerOption>
              ))}
            </PickerMenu>
          </PopupButton>
          <PopupButton label="PickerOption rows">
            <PickerMenu solid>
              {POPOUT_LABELS.map((label, i) => (
                <PickerOption key={label} ring selected={i === 0} onClick={() => {}}>
                  {label}
                </PickerOption>
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
      <FieldsLeaf />
      <LabelsLeaf />
      <MenuLeaf />
    </div>
  )
}
