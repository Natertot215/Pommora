import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'

import type { ColumnLook } from '@shared/columnStyles'
import type { PropertyDefinition } from '@shared/properties'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { ColorPicker } from '@renderer/DesignSystem/Pickers/ColorPicker/ColorPicker'
import { OptionChip } from '@renderer/Properties/Assignment/OptionChip'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { OptionNameCaret, ghostAnchorProps } from './GhostOptionChip'
import type { GhostAnchor } from '@renderer/DesignSystem/Interactions/ghostAnchor'
import * as s from '../Frames/frames.css'
import { compactTitle } from './optionRow.css'
import { labelColor, shape as labelShape, optionShapeFor } from '@renderer/DesignSystem/Labels'

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
  def,
  renaming,
  coloring,
  iconEditing,
  paletteRef,
  onCommitRename,
  onCancelRename,
  onToggleColoring,
  onCloseColoring,
  onPickColor,
  onEditIcon,
  onCloseIcon,
}: {
  type: string
  look: OptionStyle
  value: string
  label: string
  color: string | undefined
  icon?: string
  def?: Pick<PropertyDefinition, 'status_groups'>
  renaming: boolean
  coloring: boolean
  iconEditing?: boolean
  paletteRef: React.RefObject<HTMLButtonElement | null>
  onCommitRename: (raw: string) => void
  onCancelRename: () => void
  onToggleColoring: () => void
  onCloseColoring: () => void
  onPickColor: (color: string | undefined) => void
  onEditIcon?: (icon: string | undefined) => void
  onCloseIcon?: () => void
}): React.JSX.Element {
  const iconAnchor = useRef<HTMLSpanElement>(null)
  const option = { value, label, color, icon }
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
  // Editing the glyph previews the Compact variant whatever the view's look is, the mirror of rename
  // revealing the full name — you see the option as its icon while you pick it.
  if (iconEditing) {
    return (
      <span className={s.paletteAnchor} ref={iconAnchor}>
        <OptionChip type={type} look="compact" option={option} def={def} />
        <IconPicker
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
      <span className={s.paletteAnchor}>
        <Button
          ref={coloring ? paletteRef : undefined}
          size="button-inline"
          paddingX="0"
          icon="palette"
          iconSize={s.ICON.palette}
          className={s.paletteButton}
          style={coloring ? { opacity: 1 } : undefined}
          aria-label="Recolor"
          onClick={onToggleColoring}
        />
        <ColorPicker
          open={coloring}
          selected={labelColorFor(color)}
          onPick={onPickColor}
          onDismiss={onCloseColoring}
          triggerRef={paletteRef}
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
