import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'

import type { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { ColorPicker } from '@renderer/DesignSystem/Components/Pickers/ColorPicker/ColorPicker'
import { Icon, iconNameOr } from '@renderer/DesignSystem/Symbols'
import { defaultOptionIcon } from '@renderer/Detail/Views/PropertyEditing/OptionChip'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { OptionNameCaret, ghostAnchorProps } from './GhostOptionChip'
import type { GhostAnchor } from '@renderer/Detail/Views/useGhostAnchor'
import { PickerControl } from './PickerControl'
import * as s from './settingsPane.css'
import {
  Label,
  labelColor,
  optionShapeFor,
  shape as labelShape,
} from '@renderer/DesignSystem/Labels'

export type OptionStyle = 'standard' | 'compact'

const OPTION_STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
] as const

/** The Standard/Compact toggle, one component so the status and select/multi editors offer the axis
 *  in the identical place. It writes the active view's column look (per-view, like every other Style). */
export function OptionStyleRow({
  look,
  onSetStyle,
}: {
  look: OptionStyle
  onSetStyle: (look: OptionStyle) => void
}): React.JSX.Element {
  return (
    <div className={s.configRow}>
      <span className={s.configLabel}>Style</span>
      <PickerControl
        ariaLabel="Chip style"
        value={look}
        options={OPTION_STYLE_OPTIONS}
        onPick={onSetStyle}
      />
    </div>
  )
}

/** One reorderable option, the same row in the Select editor and the Status editor. Everything that
 *  differs between them — where the list came from, whether a group's color stands in for an unset
 *  one — is resolved by the caller and arrives here already decided, so the row states the chip, the
 *  naming caret, the palette and its picker exactly once. The chip shape follows the property type.
 *
 *  The drag wiring stays with the caller: the row registers itself, but the gesture belongs to the
 *  list that owns the ordering. */
export function OptionRow({
  type,
  label,
  color,
  icon,
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
  label: string
  /** Already resolved — a Status option inherits its group's color, a Select option has only its own. */
  color: ReturnType<typeof labelColorFor>
  /** The option's own Compact glyph, if it carries one. */
  icon?: string
  renaming: boolean
  coloring: boolean
  /** The Compact glyph editor is open on this option — it previews its icon-only variant. */
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
  const shape = optionShapeFor(type)
  if (renaming) {
    return (
      <OptionNameCaret
        className={cx(labelShape[shape], labelColor[color])}
        value={label}
        onCommit={onCommitRename}
        onCancel={onCancelRename}
      />
    )
  }
  // Editing the glyph previews the Compact (icon-only) variant, the mirror of rename revealing the
  // full name — you see the option as its icon while you pick it.
  if (iconEditing) {
    return (
      <span className={s.paletteAnchor} ref={iconAnchor}>
        <Label
          shape={shape}
          color={color}
          icon={<Icon name={iconNameOr(icon, defaultOptionIcon(type))} size="body" />}
        />
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
      <Label shape={shape} color={color} text={label} />
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
          selected={color}
          onPick={onPickColor}
          onDismiss={onCloseColoring}
          triggerRef={paletteRef}
        />
      </span>
    </>
  )
}

/** What a row needs from whichever reorder hook the list is using — the flat one and the grouped one
 *  agree on exactly this much, which is why a row can be written once for both. */
export interface RowDrag {
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
}

/** A row in its seat: the drag affordance, the hover anchor a ghost opens against, and the row
 *  itself. The gesture still belongs to the list that owns the ordering — the seat only hands each
 *  press to the handle it was given, the way the row only paints what it was told. */
export function OptionSlot({
  value,
  drag,
  ghost,
  onOpenMenu,
  ...row
}: React.ComponentProps<typeof OptionRow> & {
  value: string
  drag: RowDrag
  ghost: GhostAnchor
  onOpenMenu: () => void
}): React.JSX.Element {
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
