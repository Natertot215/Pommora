import { useRef, useState, type RefObject } from 'react'
import type { OptionAppearance, PropertyDefinition } from '@pommora/core/Properties/properties'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { ColorGrid } from '@pommora/uix/Pickers/ColorPicker/ColorPicker'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { cx } from '@pommora/uix/Utilities/cx'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { MenuSeparator } from '@pommora/uix/Menus'
import { footingLabel } from '@pommora/uix/Menus/menu-base.css'
import { Icon } from '@pommora/uix/Symbols'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { IconChoice } from '../../Assets/IconChoice'
import { optionGlyph, type OptionChipData } from '../Cells/OptionChip'
import * as s from './option-edit-popup.css'

const APPEARANCE_OPTIONS = [
  { value: 'filled', label: 'Filled' },
  { value: 'clear', label: 'Clear' },
] as const satisfies readonly PickerOption<OptionAppearance>[]

export function OptionEditPopup({
  open,
  type,
  option,
  def,
  triggerRef,
  onDismiss,
  onRename,
  onPickIcon,
  onPickColor,
  onPickAppearance,
}: {
  open: boolean
  type: string
  option: OptionChipData
  def?: Pick<PropertyDefinition, 'status_groups'>
  triggerRef: RefObject<Element | null>
  onDismiss: () => void
  onRename: (raw: string) => void
  onPickIcon: (icon: string | undefined) => void
  onPickColor: (color: string | undefined) => void
  onPickAppearance: (appearance: OptionAppearance) => void
}): React.JSX.Element {
  const iconRef = useRef<HTMLButtonElement>(null)
  const [iconOpen, setIconOpen] = useState(false)
  return (
    <>
      {/* manageFocus off: opening is inspection, not an edit — nothing rings or selects on open. */}
      <PickerMenu
        open={open}
        onDismiss={onDismiss}
        triggerRef={triggerRef}
        direction="down"
        manageFocus={false}
      >
        <div className={s.root}>
          <div className={s.fieldRow}>
            <button
              ref={iconRef}
              type="button"
              aria-label="Edit Icon"
              className={cx(s.iconSeat, iconOpen && s.iconSeatActive)}
              onClick={() => setIconOpen(true)}
            >
              <Icon name={optionGlyph(type, option, def)} size="control" />
            </button>
            <EditableInput
              value={option.label ?? option.value}
              boxed
              autoFocus={false}
              className={s.titleField}
              ariaLabel="Option Title"
              onCommit={onRename}
              onCancel={() => {}}
            />
          </div>
          <MenuSeparator flush />
          <ColorGrid
            selected={labelColorFor(option.color)}
            onPick={onPickColor}
            className={s.gridFlush}
          />
          <MenuSeparator flush />
          <div className={s.footRow}>
            <span className={footingLabel}>Appearance</span>
            <PickerControl
              ariaLabel="Appearance"
              value={option.appearance ?? 'filled'}
              options={APPEARANCE_OPTIONS}
              onPick={onPickAppearance}
            />
          </div>
        </div>
      </PickerMenu>
      <IconChoice
        open={iconOpen}
        value={option.icon}
        onSelect={(id) => {
          setIconOpen(false)
          onPickIcon(id)
        }}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
      />
    </>
  )
}
