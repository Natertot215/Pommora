import type { CSSProperties } from 'react'
import { Icon } from '../Symbols'
import { svgFrame } from '../Symbols/svgFrame'
import { solidColorCss } from '../Theme/ramp'
import { cx } from '../Utilities/cx'
import './checkbox.css'

type CheckboxSize = 'standard' | 'compact'

/** `readOnly` draws the same look as a plain value glyph, toggled by the row around it. */
export function Checkbox({
  state,
  onChange,
  ariaLabel,
  className,
  size = 'standard',
  filled,
  color,
  readOnly,
}: {
  state: boolean
  onChange?: (next: boolean) => void
  ariaLabel?: string
  className?: string
  size?: CheckboxSize
  filled?: boolean
  color?: string
  readOnly?: boolean
}): React.JSX.Element {
  const compact = size === 'compact'
  const cls = cx(
    checkboxClass(state, compact),
    filled && 'checkbox-filled',
    readOnly && 'checkbox-static',
    className,
  )
  const style = color ? ({ '--checkbox-base': solidColorCss(color) } as CSSProperties) : undefined
  const mark = state ? <CheckMark size={compact ? 9 : 12} /> : null

  if (readOnly) {
    return (
      <span className={cls} style={style} aria-hidden="true">
        {mark}
      </span>
    )
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: the rule's element is a void one — it cannot hold the centered mark this look is drawn from, and its indeterminate state is a DOM property no attribute sets; role="checkbox" on a focusable element is the pattern
    <button
      type="button"
      role="checkbox"
      aria-checked={state}
      aria-label={ariaLabel}
      className={cls}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChange?.(!state)
      }}
    >
      {mark}
    </button>
  )
}

export const checkboxClass = (checked: boolean | undefined, compact = false): string =>
  cx('checkbox', compact && 'checkbox-compact', checked && 'checkbox-checked')

export const CheckMark = ({ size }: { size: number }): React.JSX.Element => (
  <Icon name="check" size={size} strokeWidth={3} aria-hidden />
)

/** The same mark as markup, for the editor's widgets that build DOM without React. */
export const checkMarkSvg = (size: number): string =>
  svgFrame('<path d="M20 6 9 17l-5-5"/>', { strokeWidth: 3, size })
