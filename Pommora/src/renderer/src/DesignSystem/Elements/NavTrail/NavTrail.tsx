import { Fragment } from 'react'
import { OverScroll } from '../../Interactions/OverScroll'
import { Icon } from '../../Symbols'
import type { IconSize } from '../../Tokens/size.css'
import { cx } from '../../Util/cx'
import { PathChevron } from '../PathChevron/PathChevron'
import * as s from './navTrail.css'

/** One stop on a location trail. `onSelect` makes it a button; `ghost` dims a stop past the current
 *  one — a path backed out of, still there to re-descend into. */
export interface TrailSegment {
  title: string
  icon?: string
  ghost?: boolean
  onSelect?: () => void
}

export interface NavTrailProps {
  segments: readonly TrailSegment[]
  iconSize?: IconSize
  chevronSize?: 'control' | 'caption'
  /** The trail reads a step dimmer and the current stop — the last one that isn't a ghost — reads
   *  in the control tone. */
  emphasize?: boolean
  /** Hover-scrolls the run as one; off, each segment truncates on its own. */
  overScroll?: boolean
  className?: string
  segmentClassName?: string
}

export function NavTrail({
  segments,
  iconSize = 'caption',
  chevronSize = 'caption',
  emphasize = false,
  overScroll = true,
  className,
  segmentClassName,
}: NavTrailProps): React.JSX.Element | null {
  if (segments.length === 0) return null
  let currentIndex = -1
  if (emphasize) {
    currentIndex = segments.length - 1
    while (currentIndex >= 0 && segments[currentIndex].ghost) currentIndex--
  }
  const Host = overScroll ? OverScroll : 'div'
  return (
    <Host className={cx(s.trail, emphasize && s.emphasized, className)}>
      {segments.map((seg, i) => {
        const cls = cx(
          s.segment,
          seg.ghost && s.ghost,
          i === currentIndex && s.current,
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
            {i > 0 && <PathChevron size={chevronSize} className={s.chevron} />}
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
