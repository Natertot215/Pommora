import { Fragment, type ReactNode } from 'react'
import { inlineSegment } from './segment.css'

export function Segments({ parts }: { parts: readonly ReactNode[] }): React.JSX.Element {
  return (
    <>
      {parts.map((part, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts are positional by definition
        <Fragment key={i}>
          {i > 0 && <span className={inlineSegment} aria-hidden="true" />}
          {part}
        </Fragment>
      ))}
    </>
  )
}
