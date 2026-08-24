import { Fragment } from 'react'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { PathChevron } from '@renderer/DesignSystem/Elements/PathChevron/PathChevron'
import type { Crumb } from './crumbs'

const crumb = (ghost?: boolean): string =>
  cx('subfield-crumb', ghost && 'ghost', overScrollEllipsis)

export function SubfieldBreadcrumb({ crumbs }: { crumbs: Crumb[] }): React.JSX.Element {
  return (
    <div className="subfield-crumbs">
      {crumbs.map((c, i) => (
        <Fragment key={c.key}>
          {i > 0 && <PathChevron tone="secondary" />}
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
