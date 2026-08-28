import { Fragment } from 'react'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import * as sr from './segmentRun.css'
import { FileLabel } from '@renderer/DesignSystem/Labels/recipes'

/** The stamp a surface hit-tests to learn which entry a click landed on. Written here and by the
 *  file cell, which composes its own chips rather than a run, and read back by the file effect —
 *  three files, one attribute, so it is spelled once. */
export const SEGMENT_INDEX_ATTR = 'data-segment-index'

export interface SegmentEntry {
  key: string
  label: string
  /** Rendered before the label, overriding whatever the label's own name would derive. A run whose
   *  entries are all the same kind of thing usually wants one leading glyph on the run instead —
   *  repeating an identical icon reads as noise. */
  icon?: React.ReactNode | false
  /** Opts this entry into the hover-×. It removes THIS entry, so the handler owns what that means. */
  onRemove?: () => void
}

/** Values standing beside one another, hairline-divided. Each entry is a `FileLabel`, so the
 *  glyph, the title and the hover-× are composed in ONE place rather than restated by every
 *  caller. */
export function SegmentRun({ entries }: { entries: SegmentEntry[] }): React.JSX.Element {
  return (
    <OverScroll className={sr.segmentRun}>
      {entries.map((e, i) => (
        <Fragment key={e.key}>
          {i > 0 && <span className={sr.segmentDivider} />}
          {/* Its position, so a surface can hit-test which entry a click or a right-click landed
              on without the run growing a callback per gesture. */}
          <span className={sr.segment} {...{ [SEGMENT_INDEX_ATTR]: i }}>
            <FileLabel
              name={e.label}
              icon={e.icon}
              {...(e.onRemove ? { onRemove: e.onRemove } : {})}
            />
          </span>
        </Fragment>
      ))}
    </OverScroll>
  )
}
