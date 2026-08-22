import { Fragment } from 'react'
import { OverflowScroll } from '../OverflowScroll'
import * as sr from './segmentRun.css'

export interface SegmentEntry {
  key: string
  label: string
  /** Rendered before the label. A run whose entries are all the same kind of thing usually wants
   *  one leading glyph on the run instead — repeating an identical icon reads as noise. */
  icon?: React.ReactNode
  /** A trailing affordance inside the segment, such as a remove. Its own reveal is the caller's. */
  trailing?: React.ReactNode
}

/** The divided run. `nested` says what the entries are to each other, which is what the separator
 *  reports: the hairline separates VALUES standing beside one another, while a nested run's
 *  entries each sit INSIDE the one before — a descent through a path — and take the breadcrumb's
 *  own `›`. */
export function SegmentRun({
  entries,
  nested = false,
}: {
  entries: SegmentEntry[]
  nested?: boolean
}): React.JSX.Element {
  return (
    <OverflowScroll className={sr.segmentRun}>
      {entries.map((e, i) => (
        <Fragment key={e.key}>
          {i > 0 &&
            (nested ? (
              <span className={sr.segmentChevron}>›</span>
            ) : (
              <span className={sr.segmentDivider} />
            ))}
          <span className={sr.segment}>
            {e.icon}
            <span className={sr.segmentLabel}>{e.label}</span>
            {e.trailing}
          </span>
        </Fragment>
      ))}
    </OverflowScroll>
  )
}
