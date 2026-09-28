import { Fragment, type ReactNode } from 'react'
import { cx } from '../Utilities/cx'
import * as s from './segment.css'

export function Segments({ parts }: { parts: readonly ReactNode[] }): React.JSX.Element {
  return (
    <span className={s.segments}>
      {parts.map((part, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts are positional by definition
        <Fragment key={i}>
          {i > 0 && <span className={cx(s.segment, s.inlineSegment)} aria-hidden="true" />}
          {part}
        </Fragment>
      ))}
    </span>
  )
}
