import { Fragment } from 'react'
import { OverflowScroll } from '../OverflowScroll'
import { FileLabel } from '../FileLabel'
import * as sr from './segmentRun.css'

export interface SegmentEntry {
  key: string
  label: string
  /** Rendered before the label, overriding whatever the label's own name would derive. A run whose
   *  entries are all the same kind of thing usually wants one leading glyph on the run instead —
   *  repeating an identical icon reads as noise. */
  icon?: React.ReactNode | false
  /** Opts this entry into the hover-×. It removes THIS entry, so the handler owns what that means. */
  onRemove?: () => void
  /** Opts this entry into a click of its own — a file label opens the dialog at its own folder. */
  onClick?: () => void
  /** The entry names something that isn't there. It still renders, reading as naming nothing. */
  unresolved?: boolean
}

/** The divided run. `nested` says what the entries are to each other, which is what the separator
 *  reports: the hairline separates VALUES standing beside one another, while a nested run's
 *  entries each sit INSIDE the one before — a descent through a path — and take the breadcrumb's
 *  own `›`.
 *
 *  Each entry is a `FileLabel`, so the glyph, the title and the hover-× are composed in ONE place
 *  rather than restated by every caller. */
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
          {/* Its position, so a surface can hit-test which entry a click or a right-click landed
              on without the run growing a callback per gesture. */}
          <span className={sr.segment} data-segment-index={i}>
            <FileLabel
              name={e.label}
              // A nested run is a PATH: its segments are folders, not file types, and it carries
              // one lead icon of its own — so an entry that names no glyph gets none rather than
              // deriving one per segment.
              icon={e.icon ?? (nested ? false : undefined)}
              {...(e.onRemove ? { onRemove: e.onRemove } : {})}
              {...(e.onClick ? { onClick: e.onClick } : {})}
              {...(e.unresolved ? { unresolved: true } : {})}
            />
          </span>
        </Fragment>
      ))}
    </OverflowScroll>
  )
}
