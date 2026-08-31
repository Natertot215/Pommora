import { useState, type ReactNode } from 'react'
import { FieldsLeaf } from './FieldsLeaf'
import { LabelsLeaf } from './LabelsLeaf'
import { MenuLeaf } from './MenuLeaf'
import { CalendarPicker } from '@renderer/DesignSystem/Pickers/CalendarPicker/CalendarPicker'
import { ImagePicker } from '@renderer/DesignSystem/Pickers/ImagePicker/ImagePicker'
import { PickerMenu, PickerOption } from '@renderer/DesignSystem/Pickers/picker-base'
import { MenuSurface } from '@renderer/DesignSystem/Menus'
import { Checkbox } from '@renderer/DesignSystem/Controls/Checkbox'
import { condensedDate, formatDate } from '@renderer/Properties/Assignment/formatValue'
import { Label } from '@renderer/DesignSystem/Labels'

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

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#4a6d8c"/><circle cx="300" cy="200" r="120" fill="#e8b04b"/></svg>',
)}`

function ImagePickerDemo(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [shape, setShape] = useState<'circle' | 'rect'>('rect')
  return (
    <>
      <button type="button" className="ds-switcher-btn" onClick={() => setOpen(true)}>
        ImagePicker
      </button>
      <button
        type="button"
        className="ds-switcher-btn"
        onClick={() => setShape((s) => (s === 'rect' ? 'circle' : 'rect'))}
      >
        {shape}
      </button>
      <ImagePicker
        open={open}
        value={SAMPLE_IMAGE}
        shape={shape}
        boxAspect={shape === 'rect' ? 1 / 3 : 1}
        onCancel={() => setOpen(false)}
        onSave={() => setOpen(false)}
      />
    </>
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
          <ImagePickerDemo />
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
