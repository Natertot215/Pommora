import { useEffect, useRef, useState, type RefObject } from 'react'
import type { OptionAppearance, PropertyDefinition } from '@shared/properties'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { ColorGrid } from '@renderer/DesignSystem/Pickers/ColorPicker/ColorPicker'
import { PickerControl, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { EditableInput } from '@renderer/DesignSystem/Fields'
import { MenuSeparator } from '@renderer/DesignSystem/Menus'
import { footingLabel } from '@renderer/DesignSystem/Menus/menu-base.css'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { optionGlyph, type OptionChipData } from './Assignment/OptionChip'
import * as s from './optionEditPopup.css'

const APPEARANCE_OPTIONS = [
  { value: 'filled', label: 'Filled' },
  { value: 'clear', label: 'Clear' },
] as const satisfies readonly PickerChoice<OptionAppearance>[]

/** The one editor an option's square-pen opens: identity (icon + title) over the color grid over
 *  the Appearance footing. Each act commits through its own existing write — nothing batches. */
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
}): React.JSX.Element | null {
  const iconRef = useRef<HTMLButtonElement>(null)
  const [iconOpen, setIconOpen] = useState(false)
  // Escape peels one layer (the CalendarPicker inner-menu idiom): while the IconPicker is up it
  // takes the key on capture, so the editor pane underneath survives to the second press.
  useEffect(() => {
    if (!iconOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setIconOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [iconOpen])
  return (
    <>
      {/* manageFocus off: opening is inspection, not an edit — neither field takes focus until
          clicked, so nothing rings or selects on open. */}
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
      <IconPicker
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
