import { cx } from '../../Util/cx'
import { pathChevron, pathChevronSecondary, pathChevronSmall } from './pathChevron.css'

export function PathChevron({
  tone = 'tertiary',
  size = 'control',
  className,
}: {
  tone?: 'secondary' | 'tertiary'
  size?: 'control' | 'caption'
  className?: string
}): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cx(
        pathChevron,
        tone === 'secondary' && pathChevronSecondary,
        size === 'caption' && pathChevronSmall,
        className,
      )}
    >
      ›
    </span>
  )
}
