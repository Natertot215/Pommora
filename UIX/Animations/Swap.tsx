import type { ReactNode } from 'react'
import { cx } from '../Utilities/cx'
import * as s from './swap.css'

/** Two faces in one cell as wide as the wider, so a swap cross-fades with nothing reflowing. The hidden face is inert and unnamed: its controls take no press or focus, and a button names itself by the face it shows. */
export function Swap({
  swapped,
  from,
  to,
  className,
}: {
  swapped: boolean
  from: ReactNode
  to: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <span className={cx(s.swap, className)}>
      {face(from, swapped)}
      {face(to, !swapped)}
    </span>
  )
}

/** A face's attributes, for a host drawing the faces itself. */
export const faceAttrs = (hidden: boolean) => ({
  'data-face': hidden ? 'hidden' : 'shown',
  'aria-hidden': hidden ? ('true' as const) : undefined,
  inert: hidden,
})

const face = (node: ReactNode, hidden: boolean): React.JSX.Element => (
  <span className={s.face} {...faceAttrs(hidden)}>
    {node}
  </span>
)
