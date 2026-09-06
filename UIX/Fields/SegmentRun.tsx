import { Fragment } from 'react'
import { OverScroll } from '../Elements/OverScroll'
import * as sr from './segment-run.css'
import { FileLabel } from '../Labels/recipes'

/** Also written by the file cell and read back by the file effect. */
export const SEGMENT_INDEX_ATTR = 'data-segment-index'

interface SegmentEntry {
  key: string
  label: string
  icon?: React.ReactNode | false
  /** Opts into the hover-×. It removes THIS entry, so the handler owns what that means. */
  onRemove?: () => void
}

export function SegmentRun({ entries }: { entries: SegmentEntry[] }): React.JSX.Element {
  return (
    <OverScroll className={sr.segmentRun}>
      {entries.map((e, i) => (
        <Fragment key={e.key}>
          {i > 0 && <span className={sr.segmentDivider} />}
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
