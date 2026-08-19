import { chipBoxGeometry } from '@renderer/design-system/tokens/chip.css'
import { cx } from '../cx'
import './checkbox.css'

/** The editor's task marker as a real control. The look is shared with it down to the class; what
 *  this adds is the semantics a CodeMirror widget deliberately has none of — a role, a label, and
 *  keyboard activation. */
export function Checkbox({
  state,
  onChange,
  ariaLabel,
  className,
  small,
}: {
  state: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
  className?: string
  /** Seat it in a row's narrow inset, beside where a pin or a grip would ride. */
  small?: boolean
}): React.JSX.Element {
  const mark = small ? 9 : 12
  return (
    // biome-ignore lint/a11y/useSemanticElements: the rule's element is a void one — it cannot hold the centered mark this look is drawn from, and its indeterminate state is a DOM property no attribute sets; role="checkbox" on a focusable element is the pattern
    <button
      type="button"
      role="checkbox"
      aria-checked={state}
      aria-label={ariaLabel}
      className={cx(
        chipBoxGeometry,
        'pm-checkbox',
        small && 'pm-checkbox-small',
        state && 'pm-checkbox-checked',
        className,
      )}
      // The row underneath is the checkbox's own larger target, so the press must not reach it
      // twice — and a press on a control never arms whatever gesture the row carries.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!state)
      }}
    >
      {state ? <CheckMark size={mark} /> : null}
    </button>
  )
}

// Drawn rather than drawn from the registry: these ride inside a 17px box at a stroke the icon
// components don't offer, and the editor's widget emits the identical markup as a raw string.
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
