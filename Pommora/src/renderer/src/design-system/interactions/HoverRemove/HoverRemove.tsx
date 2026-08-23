import { Icon } from '../../symbols'
import { cx } from '../../cx'
import { overScrollHost, overScrollUnmasked } from '../OverScroll'
import * as s from './hoverRemove.css'

/** The class the element holding a `HoverRemove` wears: it seats the × and, for `reveal="host"`,
 *  is the thing whose hover reveals it. Carries the over-scroll host too — a wrapped label is
 *  pointer-inert, so its scroll can only be armed from here. */
export const hoverRemoveHost = cx(s.host, overScrollHost)

const revealed = (el: Element): boolean => Number.parseFloat(getComputedStyle(el).opacity) > 0.5

/**
 * The app's one hover-revealed remove ×, rendered as SIBLINGS rather than a wrapper: the reveal
 * runs through a sibling combinator, so the × has to precede the text inside the host's own box.
 *
 * `reveal="self"` gives the × the host's right third — a × only its own hover reveals has to be
 * findable. `reveal="host"` leaves it a bare button the caller seats, since the host's hover
 * already surfaces it.
 *
 * INERT until revealed: the zone is always hoverable (that's what reveals it), but a click only
 * removes once the × is actually visible, so a fast click on an invisible control can't silently
 * delete a value.
 */
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
  /** The text the × sits beside. Omitted where the host already draws its own. */
  children?: string
  /** Melt the text tail beneath the ×. Needs a ground to melt into (`--melt-ground`), which is
   *  why glass surfaces take the plain fade instead. */
  blur?: boolean
  reveal?: 'self' | 'host'
  label?: string
  size?: React.ComponentProps<typeof Icon>['size']
  /** Dresses the ×. */
  className?: string
  /** Dresses the text box — where a host states its own width cap. */
  labelClassName?: string
}): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        className={cx(
          s.removeButton,
          reveal === 'self' ? s.removeZone : s.revealFromHost,
          className,
        )}
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
