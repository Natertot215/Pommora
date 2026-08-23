import { Fragment } from 'react'
import { overScrollEllipsis } from '@renderer/design-system/interactions/OverScroll'
import { cx } from '@renderer/design-system/cx'
import type { Crumb } from './crumbs'

const crumb = (ghost?: boolean): string =>
  cx('subfield-crumb', ghost && 'ghost', overScrollEllipsis)

export function SubfieldBreadcrumb({ crumbs }: { crumbs: Crumb[] }): React.JSX.Element {
  return (
    <div className="subfield-crumbs">
      {crumbs.map((c, i) => (
        <Fragment key={c.key}>
          {i > 0 && <span className="subfield-sep">›</span>}
          {c.onClick ? (
            <button type="button" className={crumb(c.ghost)} onClick={c.onClick}>
              {c.title}
            </button>
          ) : (
            <span className={crumb(c.ghost)}>{c.title}</span>
          )}
        </Fragment>
      ))}
    </div>
  )
}
