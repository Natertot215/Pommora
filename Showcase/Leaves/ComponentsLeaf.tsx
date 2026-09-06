import { useState, type ReactNode } from 'react'
import { FieldsLeaf } from './FieldsLeaf'
import { LabelsLeaf } from './LabelsLeaf'
import { MenuLeaf } from './MenuLeaf'
import { CalendarPicker } from '@pommora/uix/Pickers/CalendarPicker/CalendarPicker'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { MenuSurface } from '@pommora/uix/Menus'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { Label } from '@pommora/uix/Labels/Label'

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

const showcaseDate = (iso: string, condensed?: { withYear: boolean }): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(
    'en-US',
    condensed
      ? { month: 'short', day: 'numeric', ...(condensed.withYear ? { year: 'numeric' } : {}) }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  )

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
            <CalendarPicker range timeFormat="twelveHour" formatDateValue={showcaseDate} />
          </PopupButton>
          <PopupButton label="PickerMenu">
            <PickerMenu solid>
              {PICKER_LABELS.map((o, i) => (
                <PickerRow key={o.label} selected={i === 0} onClick={() => {}}>
                  <Label color={o.color} text={o.label} shape="tag" />
                </PickerRow>
              ))}
            </PickerMenu>
          </PopupButton>
          <PopupButton label="PickerRow">
            <PickerMenu solid>
              {POPOUT_LABELS.map((label, i) => (
                <PickerRow key={label} ring selected={i === 0} onClick={() => {}}>
                  {label}
                </PickerRow>
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
      <section className="ds-section">
        <h2>Checkboxes</h2>
        <CheckboxDemo />
      </section>
      <FieldsLeaf />
      <LabelsLeaf />
      <MenuLeaf />
    </div>
  )
}

/** The one checkbox at both sizes, empty and filled, plain and per-color. */
function CheckboxDemo(): React.JSX.Element {
  const [a, setA] = useState(false)
  const [b, setB] = useState(true)
  const [c, setC] = useState(false)
  const [d, setD] = useState(true)
  const [e, setE] = useState(true)
  return (
    <div className="ds-chip-row-items">
      <Checkbox state={a} onChange={setA} ariaLabel="Standard" />
      <Checkbox size="compact" state={b} onChange={setB} ariaLabel="Compact" />
      <Checkbox filled state={c} onChange={setC} ariaLabel="Filled, empty" />
      <Checkbox filled state={d} onChange={setD} ariaLabel="Filled, checked" />
      <Checkbox filled color="blue" state={e} onChange={setE} ariaLabel="Filled, blue" />
    </div>
  )
}
