import type { ReactNode } from 'react'
import {
  chipPill,
  chipFile,
  chipLabel,
  chipPlain,
  chipColor,
  chipLabelCap,
} from '@renderer/design-system/tokens'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cx } from '@renderer/design-system/cx'
import { HoverRemove, hoverRemoveHost } from '@renderer/design-system/interactions/HoverRemove'
import { overScrollUnmasked } from '@renderer/design-system/interactions/OverScroll'

/** Context chips use their own shape (ContextChip's chip-context) — not part of this map. */
const SHAPE = { pill: chipPill, label: chipLabel, file: chipFile, plain: chipPlain } as const
export type ChipShape = keyof typeof SHAPE

/** The class a shape wears, for the surfaces that dress something to READ as a chip without being
 *  one — the naming caret standing in a chip's seat. Reading it here is what keeps the caret and
 *  the chip it becomes from wearing different shapes. */
export const chipShapeClass = (shape: ChipShape): string => SHAPE[shape]

/** One source, so no surface renders a status as a label by accident. */
export function chipShapeForType(type: string): ChipShape {
  return type === 'status' ? 'pill' : 'label'
}

/** `onRemove` opts into the hover ×: it removes THIS chip's value, so the handler owns what
 *  that means (one option off a multi, the whole value off a single). */
export function Chip({
  color,
  label,
  shape = 'pill',
  icon,
  onRemove,
  className,
}: {
  /** Absent paints no tint — the chrome-less shapes carry their own ground. */
  color?: ChipColorName
  label: string
  shape?: ChipShape
  icon?: ReactNode
  onRemove?: () => void
  /** Trailing so a caller can wear a state over the chip's own chrome — the ghost dim, for one —
   *  without a second element between the shape and its label. */
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cx(
        SHAPE[shape],
        color && chipColor[color],
        onRemove && hoverRemoveHost,
        className,
      )}
    >
      {icon}
      <ChipLabel label={label} onRemove={onRemove} />
    </span>
  )
}

/** The chip label, shared by every chip surface. A removable one hands its text to the shared
 *  `HoverRemove`, which melts the tail beneath the ×. */
export function ChipLabel({
  label,
  onRemove,
}: {
  label: string
  onRemove?: () => void
}): React.JSX.Element {
  if (onRemove) {
    return (
      <HoverRemove onRemove={onRemove} blur labelClassName={chipLabelCap}>
        {label}
      </HoverRemove>
    )
  }
  return <span className={cx(chipLabelCap, overScrollUnmasked)}>{label}</span>
}
