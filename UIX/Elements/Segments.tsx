import { Fragment, isValidElement, type ReactNode } from 'react'
import { inlineSegment } from './segment.css'

export function Segments({ parts }: { parts: readonly ReactNode[] }): React.JSX.Element {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={isValidElement(part) && part.key !== null ? part.key : i}>
          {i > 0 && <span className={inlineSegment} aria-hidden="true" />}
          {part}
        </Fragment>
      ))}
    </>
  )
}
