import type { ReactNode } from 'react'
import * as s from './fields.css'
import { cx } from '../../Util/cx'
import { onActivateKey } from '../../Interactions/activate'

/** For editing, pass the family `input` class to a raw <input> (e.g. EditableInput) so the editor reuses the exact chrome with no focus ring/animation. */
export function InputField({
  children,
  className,
  onClick,
  outline,
  capped,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  outline?: string
  capped?: boolean
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
      {capped ? (
        <span className={cx(s.contentRow, 'over-scroll-x', 'over-scroll-cap')}>{children}</span>
      ) : (
        children
      )}
    </div>
  )
}
