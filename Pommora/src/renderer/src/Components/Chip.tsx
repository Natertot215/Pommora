import type { ReactNode } from 'react'
import {
  chipPill,
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
const SHAPE = { pill: chipPill, label: chipLabel } as const
export type ChipShape = keyof typeof SHAPE

/** THE canonical shape for a property/value type — status wears the pill exclusively; select and
 *  multi-select wear the squared label. One source, so no surface renders a status as a label by
 *  accident. Every type-driven chip site resolves its shape through here. */
export function chipShapeForType(type: string): ChipShape {
  return type === 'status' ? 'pill' : 'label'
}

/** The shared text chip — the chip recipe (colored fill/border/text) with a capped,
 *  hover-scrolling label. One source for table select/status/multi-select cells
 *  AND the inline picker. `onRemove` opts into the hover ×: it removes THIS chip's value, so
 *  the handler owns what that means (one option off a multi, the whole value off a single). */
export function Chip({
  color,
  label,
  shape = 'pill',
  icon,
  onRemove,
}: {
  color: ChipColorName
  label: string
  shape?: ChipShape
  icon?: ReactNode
  onRemove?: () => void
}): React.JSX.Element {
  return (
    <span className={cx(SHAPE[shape], chipColor[color], onRemove && chipRemovable)}>
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

/** THE hover-revealed remove × — shared by every surface that hides a remove until hover: the chip
 *  family (its default skin, the glyph in the chip's text color with the label tail blurring beneath)
 *  and the FilterPane's Location segments, which swap `className` for their own placement. The
 *  BEHAVIOUR is the point and is why this is one component: INERT until revealed — the zone is always
 *  hoverable (that's what reveals it), but a click only removes once the × is actually visible, so a
 *  fast un-hovered click falls through to the host instead of silently deleting a value.
 *  Reveal is read off computed opacity, so a skin may reveal on its OWN hover or its host's. */
const revealed = (el: Element): boolean => Number.parseFloat(getComputedStyle(el).opacity) > 0.5
export function ChipRemoveButton({
  onRemove,
  className = chipRemove,
  label = 'Remove',
  size = 11,
}: {
  onRemove: () => void
  className?: string
  label?: string
  size?: number
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
        if (!revealed(e.currentTarget)) return // un-revealed: bubble through — the host handles it
        e.stopPropagation()
        onRemove()
      }}
    >
      <Icon name="x" size={size} strokeWidth={3} />
    </button>
  )
}
