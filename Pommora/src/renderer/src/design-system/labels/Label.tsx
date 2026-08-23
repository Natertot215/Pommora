import type { ReactNode } from 'react'
import { cx } from '../cx'
import { HoverRemove, hoverRemoveHost } from '../interactions/HoverRemove'
import { overScrollUnmasked } from '../interactions/OverScroll'
import * as s from './labels.css'
import type { LabelColorName, LabelShape } from './labels.css'

export type LabelProps = {
  shape: LabelShape
  /** Tints fill, border and text together. Absent paints none. */
  color?: LabelColorName
  text?: string
  icon?: ReactNode
  /** Named only where it differs from the tint. */
  fill?: keyof typeof s.fill
  outline?: keyof typeof s.outline
  align?: 'start'
  roomy?: boolean
  /** The hover × removes THIS label's value, so the handler owns what that means. */
  onRemove?: () => void
  className?: string
}

/**
 * One label, composed rather than named: a SHAPE says how big and how round, and fill, outline,
 * alignment, tint and content are independent of it and of each other. Every named label is a
 * recipe over these axes, so an unused combination costs a line rather than a class.
 */
export function Label({
  shape,
  color,
  text,
  icon,
  fill,
  outline,
  align,
  roomy,
  onRemove,
  className,
}: LabelProps): React.JSX.Element {
  return (
    <span
      className={cx(
        s.shape[shape],
        color && s.labelColor[color],
        fill && s.fill[fill],
        outline && s.outline[outline],
        align === 'start' && s.alignStart,
        roomy && s.roomy,
        onRemove && hoverRemoveHost,
        className,
      )}
    >
      {icon}
      {text != null && <LabelText text={text} onRemove={onRemove} />}
    </span>
  )
}

/** Capped and scrollable; a removable one melts its tail beneath the × via `HoverRemove`. */
function LabelText({ text, onRemove }: { text: string; onRemove?: () => void }): React.JSX.Element {
  if (onRemove) {
    return (
      <HoverRemove onRemove={onRemove} blur labelClassName={s.textCap}>
        {text}
      </HoverRemove>
    )
  }
  return <span className={cx(s.textCap, overScrollUnmasked)}>{text}</span>
}
