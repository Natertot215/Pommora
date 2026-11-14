import type { HTMLAttributes } from 'react'
import { cx } from '../Utilities/cx'
import { bullet } from './bullet.css'

export const BULLET = '•'

export function Bullet({ className, ...rest }: HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span {...rest} className={cx(bullet, className)}>
      {BULLET}
    </span>
  )
}
