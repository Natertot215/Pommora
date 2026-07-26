import type { ReactNode } from 'react'
import * as s from './interactionField.css'
import { onActivateKey } from '../interactions/activate'

/**
 * Interaction Field — the shared fill-quinary, rounded input surface for text + other inputs (the
 * ViewPane title, pane inputs…). One source so every input shares identical chrome. Render static
 * content for a display field; for editing, pass `fieldInputClass` to a raw <input> (e.g.
 * EditableInput) so the editor reuses the exact chrome with no focus ring/animation.
 */
export function InteractionField({
  children,
  className,
  onClick,
  outline,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  /** OutlineTint — an already-resolved ring color (e.g. `tintAt(color, TINT_STEPS.secondary)`);
   *  unset stays ringless. */
  outline?: string
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the button role is applied conditionally on the click handler, which a static parse cannot see
    <div
      className={className ? `${s.field} ${className}` : s.field}
      style={outline ? ({ '--field-ring': outline } as React.CSSProperties) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? onActivateKey(onClick) : undefined}
    >
      {children}
    </div>
  )
}

/** The borderless, focus-ring-free input chrome — hand to EditableInput's `className`. */
export const fieldInputClass = s.input
