import type { ReactNode } from 'react'
import {
  chipPill,
  chipFile,
  chipLabel,
  chipColor,
  chipLabelWrap,
  chipLabelBlur,
  chipLabelMelt,
  chipLabelText,
  chipRemovable,
  chipRemove,
} from '@renderer/design-system/tokens'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'

/** Context chips use their own shape (ContextChip's chip-context) — not part of this map. */
const SHAPE = { pill: chipPill, label: chipLabel, file: chipFile } as const
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
      className={cx(SHAPE[shape], color && chipColor[color], onRemove && chipRemovable, className)}
    >
      {onRemove ? <ChipRemoveButton onRemove={onRemove} /> : null}
      {icon}
      <ChipLabel label={label} removable={!!onRemove} />
    </span>
  )
}

/** The chip label, shared by every chip surface. A removable chip renders the text THREE times —
 *  the crisp copy plus its pre-masked melt and blur twins — so hovering the × zone smears the tail
 *  beneath it through opacity swaps alone (see the reveal note in chip.css.ts). */
export function ChipLabel({
  label,
  removable,
}: {
  label: string
  removable: boolean
}): React.JSX.Element {
  return (
    <span className={chipLabelWrap}>
      <span className={chipLabelText}>{label}</span>
      {removable ? (
        <>
          <span className={chipLabelMelt} aria-hidden>
            {label}
          </span>
          <span className={chipLabelBlur} aria-hidden>
            {label}
          </span>
        </>
      ) : null}
    </span>
  )
}

/** INERT until revealed: the zone is always hoverable (that's what reveals it), but a click only
 *  removes once the × is actually visible — a fast un-hovered click falls through to the host
 *  instead of silently deleting a value. Reveal is read off computed opacity, so a skin may
 *  reveal on its OWN hover or its host's. */
const revealed = (el: Element): boolean => Number.parseFloat(getComputedStyle(el).opacity) > 0.5
export function ChipRemoveButton({
  onRemove,
  className = chipRemove,
  label = 'Remove',
  size = 'caption',
}: {
  onRemove: () => void
  className?: string
  label?: string
  size?: React.ComponentProps<typeof Icon>['size']
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        if (revealed(e.currentTarget)) e.stopPropagation()
      }}
      onClick={(e) => {
        if (!revealed(e.currentTarget)) return
        e.stopPropagation()
        onRemove()
      }}
    >
      <Icon name="x" size={size} strokeWidth={3} />
    </button>
  )
}
