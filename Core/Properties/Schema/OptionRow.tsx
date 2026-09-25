import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'

import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import type { OptionAppearance, PropertyDefinition } from '@pommora/core/Properties/properties'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../Cells/OptionChip'
import { OptionEditPopup } from './OptionEditPopup'
import { IconChoice } from '../../Assets/IconChoice'
import { OptionNameCaret } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import type { GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import * as s from '@pommora/uix/Menus/frames.css'
import { compactTitle } from './option-row.css'
import { labelColor, shape as labelShape } from '@pommora/uix/Labels/label-base.css'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'

export type OptionStyle = Extract<ColumnLook, 'standard' | 'compact'>

export const OPTION_STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
] as const satisfies readonly { value: OptionStyle; label: string }[]

function OptionRow({
  type,
  look,
  value,
  label,
  color,
  icon,
  appearance,
  def,
  renaming,
  editing,
  editButtonRef,
  onCommitRename,
  onCancelRename,
  onToggleEditing,
  onCloseEditing,
  onPickColor,
  onPickAppearance,
  onEditIcon,
}: {
  type: string
  look: OptionStyle
  value: string
  label: string
  color: string | undefined
  icon?: string
  appearance?: OptionAppearance
  def?: Pick<PropertyDefinition, 'status_groups'>
  renaming: boolean
  editing: boolean
  editButtonRef: React.RefObject<HTMLButtonElement | null>
  onCommitRename: (raw: string) => void
  onCancelRename: () => void
  onToggleEditing: () => void
  onCloseEditing: () => void
  onPickColor: (color: string | undefined) => void
  onPickAppearance: (appearance: OptionAppearance) => void
  onEditIcon: (icon: string | undefined) => void
}): React.JSX.Element {
  const option = { value, label, color, icon, appearance }
  if (renaming) {
    return (
      <OptionNameCaret
        className={cx(labelShape[optionShapeFor(type)], labelColor[labelColorFor(color)])}
        value={label}
        onCommit={onCommitRename}
        onCancel={onCancelRename}
      />
    )
  }
  return (
    <>
      <span className={s.optionLead}>
        <OptionChip type={type} look={look} option={option} def={def} />
        {look === 'compact' && <span className={compactTitle}>{label}</span>}
      </span>
      <span className={s.optionAnchor}>
        <Button
          ref={editing ? editButtonRef : undefined}
          size="button-inline"
          paddingX="0"
          icon="square-pen"
          iconSize={s.ICON.optionEdit}
          className={s.optionEditButton}
          data-reveal-held={editing || undefined}
          aria-label="Edit Option"
          onClick={onToggleEditing}
        />
        <OptionEditPopup
          open={editing}
          type={type}
          option={option}
          def={def}
          triggerRef={editButtonRef}
          onDismiss={onCloseEditing}
          onRename={onCommitRename}
          onPickIcon={onEditIcon}
          onPickColor={onPickColor}
          onPickAppearance={onPickAppearance}
        />
      </span>
    </>
  )
}

interface RowDrag {
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
}

export function OptionSlot({
  drag,
  ghost,
  onOpenMenu,
  ...row
}: React.ComponentProps<typeof OptionRow> & {
  drag: RowDrag
  ghost: GhostAnchor
  onOpenMenu: (row: HTMLElement) => void
}): React.JSX.Element {
  const { value } = row
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    <div
      ref={(el) => drag.registerRow(value, el)}
      {...ghostAnchorProps(ghost, value)}
      className={cx(s.optionRow, drag.dragging === value && s.rowDragging)}
      data-reveal-host=""
      onPointerDown={(e) => drag.onRowPointerDown(value, e)}
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(e.currentTarget)
      }}
    >
      <OptionRow {...row} />
    </div>
  )
}

export function useOptionIconChoice(
  iconOf: (value: string) => string | undefined,
  commit: (value: string, icon: string) => void,
): {
  editing: boolean
  begin: (value: string, row: HTMLElement) => void
  picker: React.JSX.Element
} {
  const [value, setValue] = useState<string | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  return {
    editing: value !== null,
    begin: (next, row) => {
      anchor.current = row
      setValue(next)
    },
    picker: (
      <IconChoice
        open={value !== null}
        value={value === null ? undefined : iconOf(value)}
        onSelect={(icon) => {
          if (value !== null) commit(value, icon)
        }}
        onClose={() => setValue(null)}
        triggerRef={anchor}
      />
    ),
  }
}
