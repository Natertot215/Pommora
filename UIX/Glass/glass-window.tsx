import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../Utilities/cx'
import { frostRim, frostStyle, WINDOW_FROST } from './glass-base'
import * as s from './glass-window.css'

const FROST = frostStyle(WINDOW_FROST, false)
const RIM = { boxShadow: frostRim(WINDOW_FROST) }

/** Only the fill separates it from `GlassSurface`: a window has to hold its content legible over whatever it floats above. Its rim draws above that content, so a band run to the edge keeps the glass edge. */
export function GlassWindow({
  children,
  className,
  style,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cx(s.root, className)} style={{ ...FROST, ...style }} {...rest}>
      {children}
      <div className={s.rim} style={RIM} aria-hidden="true" />
    </div>
  )
}
