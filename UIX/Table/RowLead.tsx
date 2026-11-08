import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../Utilities/cx'

/** A row's lead cell, its content stepped in by `indent`: the gutter beside it is drawn as part of the row so a hover arriving straight at its rail slot reveals `slotted`, what the slot holds, while a press, click, or right-click on the gutter reaches nothing. */
export function RowLead({
  indent,
  slotted,
  children,
  ...cell
}: HTMLAttributes<HTMLDivElement> & {
  indent?: string
  slotted?: ReactNode
}): React.JSX.Element {
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
      {slotted}
      {children}
    </div>
  )
}
