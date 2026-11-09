import { Icon } from '../Symbols'
import { cx } from '../Utilities/cx'

/** The chevron that folds a footer bar, revealed from its host's reveal bar. */
export function FooterToggle({
  open,
  onOpenChange,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  className: string
}): React.JSX.Element {
  const label = open ? 'Hide Footer' : 'Show Footer'
  return (
    <button
      type="button"
      className={cx(className, 'reveal-toggle')}
      data-reveal-host=""
      data-reveal-trail
      onClick={() => onOpenChange(!open)}
      aria-label={label}
      title={label}
    >
      <Icon name={open ? 'chevron-down' : 'chevron-up'} size="headline" />
    </button>
  )
}
