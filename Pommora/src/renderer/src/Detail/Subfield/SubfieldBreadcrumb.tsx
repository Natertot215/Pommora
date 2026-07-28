import { Fragment } from 'react'
import type { Crumb } from './crumbs'

export function SubfieldBreadcrumb({ crumbs }: { crumbs: Crumb[] }): React.JSX.Element {
  return (
    <div className="subfield-crumbs">
      {crumbs.map((c, i) => (
        <Fragment key={c.key}>
          {i > 0 && <span className="subfield-sep">›</span>}
          {c.onClick ? (
            <button
              type="button"
              className={c.ghost ? 'subfield-crumb ghost' : 'subfield-crumb'}
              onClick={c.onClick}
            >
              {c.title}
            </button>
          ) : (
            <span className={c.ghost ? 'subfield-crumb ghost' : 'subfield-crumb'}>{c.title}</span>
          )}
        </Fragment>
      ))}
    </div>
  )
}
