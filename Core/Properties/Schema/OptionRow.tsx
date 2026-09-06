import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'

import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import type { OptionAppearance, PropertyDefinition } from '@pommora/core/Properties/properties'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../Cells/OptionChip'
import { OptionEditPopup } from './OptionEditPopup'
import { IconChoice } from '../../Assets/IconChoice'
import { OptionNameCaret, ghostAnchorProps } from './GhostOptionChip'
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

export function OptionRow({
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
  iconEditing,
  editButtonRef,
  onCommitRename,
  onCancelRename,
  onToggleEditing,
  onCloseEditing,
  onPickColor,
  onPickAppearance,
  onEditIcon,
  onCloseIcon,
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
  iconEditing?: boolean
  editButtonRef: React.RefObject<HTMLButtonElement | null>
  onCommitRename: (raw: string) => void
  onCancelRename: () => void
  onToggleEditing: () => void
  onCloseEditing: () => void
  onPickColor: (color: string | undefined) => void
  onPickAppearance: (appearance: OptionAppearance) => void
  onEditIcon?: (icon: string | undefined) => void
  onCloseIcon?: () => void
}): React.JSX.Element {
  const iconAnchor = useRef<HTMLSpanElement>(null)
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
  if (iconEditing) {
    return (
      <span className={s.optionAnchor} ref={iconAnchor}>
        <OptionChip type={type} look="compact" option={option} def={def} />
        <IconChoice
          open
          value={icon}
          onSelect={(id) => onEditIcon?.(id)}
          onClose={() => onCloseIcon?.()}
          triggerRef={iconAnchor}
        />
      </span>
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
          style={editing ? { opacity: 1 } : undefined}
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
          onPickIcon={(id) => onEditIcon?.(id)}
          onPickColor={onPickColor}
          onPickAppearance={onPickAppearance}
        />
      </span>
    </>
  )
}

export interface RowDrag {
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
  onOpenMenu: () => void
}): React.JSX.Element {
  const { value } = row
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
    <div
      ref={(el) => drag.registerRow(value, el)}
      {...ghostAnchorProps(ghost, value)}
      className={cx(s.optionRow, drag.dragging === value && s.rowDragging)}
      onPointerDown={(e) => drag.onRowPointerDown(value, e)}
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu()
      }}
    >
      <OptionRow {...row} />
    </div>
  )
}
