import { Fragment } from 'react'
import { OverScroll } from '../../Interactions/OverScroll'
import { Icon } from '../../Symbols'
import type { IconSize } from '../../Tokens/size.css'
import { cx } from '../../Util/cx'
import * as s from './nav-trail.css'

/** One stop on a location trail. `onSelect` makes it a button; `ghost` dims a stop past the current
 *  one — a path backed out of, still there to re-descend into. */
export interface TrailSegment {
  title: string
  icon?: string
  ghost?: boolean
  onSelect?: () => void
}

export const NO_TRAIL: TrailSegment[] = []

export interface NavTrailProps {
  segments: readonly TrailSegment[]
  iconSize?: IconSize
  chevronSize?: 'control' | 'caption'
  variant?: 'path' | 'option'
  selected?: boolean
  /** Hover-scrolls the run as one; off, each segment truncates on its own. */
  overScroll?: boolean
  className?: string
  segmentClassName?: string
}

export function NavTrail({
  segments,
  iconSize = 'caption',
  chevronSize = 'caption',
  variant = 'path',
  selected = false,
  overScroll = true,
  className,
  segmentClassName,
}: NavTrailProps): React.JSX.Element | null {
  if (segments.length === 0) return null
  let leafIndex = -1
  if (selected) {
    leafIndex = segments.length - 1
    while (leafIndex >= 0 && segments[leafIndex].ghost) leafIndex--
  }
  const Host = overScroll ? OverScroll : 'div'
  return (
    <Host className={cx(s.trail, variant === 'option' && s.option, className)}>
      {segments.map((seg, i) => {
        const cls = cx(
          s.segment,
          (seg.ghost || (selected && i !== leafIndex)) && s.ghost,
          i === leafIndex && s.option,
          segmentClassName,
        )
        const body = (
          <>
            {seg.icon && <Icon name={seg.icon} size={iconSize} className={s.glyph} />}
            <span>{seg.title}</span>
          </>
        )
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a trail is strictly positional and never reorders
          <Fragment key={i}>
            {i > 0 && (
              <span
                aria-hidden
                className={cx(s.chevron, chevronSize === 'caption' && s.chevronSmall)}
              >
                ›
              </span>
            )}
            {seg.onSelect ? (
              <button type="button" className={cls} onClick={seg.onSelect}>
                {body}
              </button>
            ) : (
              <span className={cls}>{body}</span>
            )}
          </Fragment>
        )
      })}
    </Host>
  )
}

/** A filesystem path as a trail — one segment per folder, the empties a leading or doubled slash
 *  leaves behind dropped. */
export const pathSegments = (path: string): TrailSegment[] =>
  path
    .split('/')
    .filter(Boolean)
    .map((title) => ({ title }))
