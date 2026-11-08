import type { HTMLAttributes } from 'react'
import { cx } from '../Utilities/cx'

/** A row's lead cell, its content stepped in by `indent`: the gutter beside it is drawn as part of the row so a hover arriving straight at its rail slot reveals the grip or check seated there, while a press, click, or right-click on the gutter reaches nothing. */
export function RowLead({
  indent,
  children,
  ...cell
}: HTMLAttributes<HTMLDivElement> & { indent?: string }): React.JSX.Element {
  return (
    <div
      {...cell}
      className={cx('data-cell', 'cell-lead', cell.className)}
      style={{ ...cell.style, paddingLeft: indent }}
    >
      <span
        className="row-rail"
        aria-hidden="true"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      />
      {children}
    </div>
  )
}
