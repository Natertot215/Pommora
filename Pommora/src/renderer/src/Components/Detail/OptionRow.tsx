import { Icon } from '@renderer/design-system/symbols'
import { chipColor } from '@renderer/design-system/tokens'
import type { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { cx } from '@renderer/design-system/cx'
import { Chip, chipShapeClass, type ChipShape } from '../Chip'
import { ColorPicker } from './ColorPicker'
import { OptionNameCaret } from './GhostOptionChip'
import * as s from './settingsPane.css'

/** One reorderable option, the same row in the Select editor and the Status editor. Everything that
 *  differs between them — where the list came from, whether a group's color stands in for an unset
 *  one, which shape the chip takes — is resolved by the caller and arrives here already decided, so
 *  the row states the chip, the naming caret, the palette and its picker exactly once.
 *
 *  The drag wiring stays with the caller: the row registers itself, but the gesture belongs to the
 *  list that owns the ordering. */
export function OptionRow({
  label,
  shape,
  color,
  renaming,
  coloring,
  paletteRef,
  onCommitRename,
  onCancelRename,
  onToggleColoring,
  onCloseColoring,
  onPickColor,
}: {
  label: string
  shape: ChipShape
  /** Already resolved — a Status option inherits its group's color, a Select option has only its own. */
  color: ReturnType<typeof chipColorFor>
  renaming: boolean
  coloring: boolean
  paletteRef: React.RefObject<HTMLButtonElement | null>
  onCommitRename: (raw: string) => void
  onCancelRename: () => void
  onToggleColoring: () => void
  onCloseColoring: () => void
  onPickColor: (color: string | undefined) => void
}): React.JSX.Element {
  if (renaming) {
    return (
      <OptionNameCaret
        className={cx(chipShapeClass(shape), chipColor[color])}
        value={label}
        onCommit={onCommitRename}
        onCancel={onCancelRename}
      />
    )
  }
  return (
    <>
      <Chip shape={shape} color={color} label={label} />
      <span className={s.paletteAnchor}>
        <button
          ref={coloring ? paletteRef : undefined}
          type="button"
          className={s.paletteButton}
          style={coloring ? { opacity: 1 } : undefined}
          aria-label="Recolor"
          onClick={onToggleColoring}
        >
          <Icon name="palette" size={s.ICON.palette} />
        </button>
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
