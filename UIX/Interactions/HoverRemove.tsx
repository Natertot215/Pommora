import { Icon } from '../Symbols'
import { cx } from '../Utilities/cx'
import { overScrollHost, overScrollUnmasked } from './OverScroll'
import { revealTarget } from './hover-reveal.css'
import * as s from './hover-remove.css'

export const hoverRemoveHost = cx(s.host, overScrollHost)

const revealed = (el: Element): boolean => Number.parseFloat(getComputedStyle(el).opacity) > 0.5

/** A click mid-fade doesn't remove: the × acts only once it's more than half revealed. */
export function HoverRemove({
  onRemove,
  children,
  blur,
  reveal = 'self',
  label = 'Remove',
  size = 'caption',
  className,
  labelClassName,
}: {
  onRemove: () => void
  children?: string
  /** Needs a ground to melt into (`--melt-ground`), which is why glass takes the plain fade. */
  blur?: boolean
  reveal?: 'self' | 'host'
  label?: string
  size?: React.ComponentProps<typeof Icon>['size']
  className?: string
  labelClassName?: string
}): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        className={cx(s.removeButton, reveal === 'self' ? s.removeZone : revealTarget, className)}
        data-reveal-host={reveal === 'self' ? '' : undefined}
        aria-label={label}
        onPointerDown={(e) => {
          if (revealed(e.currentTarget)) e.stopPropagation()
        }}
        onClick={(e) => {
          if (!revealed(e.currentTarget)) return
          e.stopPropagation()
          onRemove()
        }}
      >
        <Icon name="x" size={size} strokeWidth={3} />
      </button>
      {children != null && (
        <span className={cx(s.labelBox, overScrollUnmasked, labelClassName)}>
          <span className={s.labelText}>{children}</span>
          {blur && (
            <>
              <span className={s.labelMelt} aria-hidden>
                {children}
              </span>
              <span className={s.labelBlur} aria-hidden>
                {children}
              </span>
            </>
          )}
        </span>
      )}
    </>
  )
}
