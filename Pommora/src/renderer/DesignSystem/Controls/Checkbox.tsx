import type { CSSProperties } from 'react'
import { solidColorCss } from '@renderer/DesignSystem/Tokens/solidColor'
import { cx } from '@renderer/DesignSystem/Util/cx'
import './checkbox.css'

export type CheckboxSize = 'standard' | 'compact'

/** The app's one checkbox. Interactive by default — a role, a label, and keyboard activation the
 *  editor's raw widget deliberately has none of; `readOnly` renders the same look as a plain value
 *  glyph the row around it toggles. `filled` gives the empty box a resting wash, and `color`
 *  overrides the accent the checked box tints from. */
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
    'checkbox',
    compact && 'checkbox-compact',
    filled && 'checkbox-filled',
    state && 'checkbox-checked',
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

// Drawn rather than pulled from the icon registry: this rides inside a 16px box at a stroke the
// icon components don't offer, and the editor's widget emits the identical markup as a raw string.
const CheckMark = ({ size }: { size: number }): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
