import type { ReactNode } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import type { useBundleBrowser } from './browser'

/** A store's date heading: `label` over the column's widest date in the rows' type, drawn unseen, so the column measures whichever is wider; a right-click picks the date's style. */
export function DateHeading({
  date,
  label,
  className,
  sampleClass,
}: {
  date: ReturnType<typeof useBundleBrowser>['date']
  label: ReactNode
  className: string
  sampleClass: string
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
      <span ref={date.measureRef} className="col-measure">
        {label}
        <span className={sampleClass} aria-hidden>
          {date.sample}
        </span>
      </span>
    </div>
  )
}
