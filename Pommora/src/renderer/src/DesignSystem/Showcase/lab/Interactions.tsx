import type { CSSProperties } from 'react'
import { DEFAULT_FEEL } from '../../Animation/feel'
import {
  ListSurface,
  GridSurface,
  TableSurface,
  TreeSurface,
  ConstraintsSurface,
  ScrollSurface,
} from './Surfaces'
import { BoardSurface } from './Board'
import './interactions.css'

const SECTIONS = [
  { id: 'list', title: 'List', hint: 'Vertical reorder', el: <ListSurface /> },
  { id: 'grid', title: 'Grid', hint: '2D reflow · 12 cells', el: <GridSurface /> },
  { id: 'table', title: 'Table', hint: 'Row reorder · 4 columns', el: <TableSurface /> },
  {
    id: 'tree',
    title: 'Tree',
    hint: 'Recursive · 3 levels · reorder per level',
    el: <TreeSurface />,
  },
  { id: 'board', title: 'Two lists · drag between', hint: 'Cross-list move', el: <BoardSurface /> },
  {
    id: 'constraints',
    title: 'Constraints',
    hint: 'Swap · axis · bounds · async-reject',
    el: <ConstraintsSurface />,
  },
  {
    id: 'scroll',
    title: 'Scrolling list',
    hint: 'Auto-scroll at edges · 20 rows',
    el: <ScrollSurface />,
  },
]

export function Interactions(): React.JSX.Element {
  const vars = {
    '--ix-dur': `${DEFAULT_FEEL.duration}ms`,
    '--ix-ease': DEFAULT_FEEL.easing,
  } as CSSProperties

  return (
    <div className="ix-wrap" style={vars}>
      <header className="ix-header">
        <div>
          <div className="ix-title">Interaction Lab</div>
          <p className="ix-sub">
            The in-house engine — two primitives drive every surface. Deep nesting, a 2D grid, a
            multi-column table, cross-list dragging, and the constraint options. One shared
            transition throughout.
          </p>
        </div>
      </header>

      <div className="ix-sections">
        {SECTIONS.map((s) => (
          <section className="ix-card" key={s.id}>
            <div className="ix-card-head">
              <span className="ix-card-title">{s.title}</span>
              <span className="ix-card-hint">{s.hint}</span>
            </div>
            <div className="ix-card-body">{s.el}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
