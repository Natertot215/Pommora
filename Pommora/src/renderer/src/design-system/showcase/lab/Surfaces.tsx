import { useState, type ReactNode } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { SortableZone, useDragItem, reorder, arraySwap, type Row } from '../../interactions/drag'
import { onActivateKey } from '../../interactions/activate'

const mk = (labels: string[], p = ''): Row[] =>
  labels.map((l, i) => ({ id: `${p}${i}-${l}`, label: l }))

function Cell({
  id,
  className,
  children,
}: {
  id: string
  className: string
  children: ReactNode
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return (
    <li ref={setNodeRef} style={style} className={className} {...handle}>
      {children}
    </li>
  )
}

export function ListSurface(): React.JSX.Element {
  const [items, setItems] = useState(mk(['Inbox', 'Today', 'Upcoming', 'Someday', 'Archive']))
  return (
    <SortableZone
      items={items.map((i) => i.id)}
      layout="list"
      getItemLabel={(id) => items.find((i) => i.id === id)?.label ?? id}
      onReorder={(a, o) => setItems((x) => reorder(x, a, o))}
    >
      <ul className="ix-vlist">
        {items.map((it) => (
          <Cell key={it.id} id={it.id} className="ix-row">
            <Icon name="circle-dashed" size="body" />
            <span>{it.label}</span>
          </Cell>
        ))}
      </ul>
    </SortableZone>
  )
}

export function GridSurface(): React.JSX.Element {
  const [items, setItems] = useState(mk(Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`)))
  return (
    <div className="ix-grid-surface">
      <SortableZone
        items={items.map((i) => i.id)}
        layout="grid"
        onReorder={(a, o) => setItems((x) => reorder(x, a, o))}
      >
        <ul className="sx-list sx-grid">
          {items.map((it) => (
            <Cell key={it.id} id={it.id} className="sx-item">
              <span>{it.label}</span>
            </Cell>
          ))}
        </ul>
      </SortableZone>
    </div>
  )
}

type TableRowT = Row & { kind: string; context: string }
const TABLE_SEED: TableRowT[] = [
  { id: 'r1', label: 'Roadmap', kind: 'Doc', context: 'Pommora' },
  { id: 'r2', label: 'Q3 Plan', kind: 'Doc', context: 'Work' },
  { id: 'r3', label: 'Design Review', kind: 'Note', context: 'Pommora' },
  { id: 'r4', label: 'Hiring', kind: 'Task', context: 'Work' },
  { id: 'r5', label: 'Budget', kind: 'Sheet', context: 'Finance' },
  { id: 'r6', label: 'Reading list', kind: 'Note', context: 'Personal' },
  { id: 'r7', label: 'Trip plan', kind: 'Doc', context: 'Personal' },
]

export function TableSurface(): React.JSX.Element {
  const [rows, setRows] = useState(TABLE_SEED)
  return (
    <SortableZone
      items={rows.map((r) => r.id)}
      layout="table"
      itemRole={null}
      getItemLabel={(id) => rows.find((r) => r.id === id)?.label ?? id}
      onReorder={(a, o) => setRows((x) => reorder(x, a, o))}
    >
      <table className="ix-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Context</th>
            <th>Modified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <TableRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </SortableZone>
  )
}

function TableRow({ row }: { row: TableRowT }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(row.id)
  return (
    <tr ref={setNodeRef} style={style} {...handle}>
      <td>
        <Icon name="file-text" size="body" /> {row.label}
      </td>
      <td className="ix-dim">{row.kind}</td>
      <td className="ix-dim">{row.context}</td>
      <td className="ix-dim">2d ago</td>
    </tr>
  )
}

type Node = { id: string; label: string; children?: Node[] }
const TREE_SEED: Node[] = [
  {
    id: 'projects',
    label: 'Projects',
    children: [
      {
        id: 'pommora',
        label: 'Pommora',
        children: [
          { id: 'atlas', label: 'Atlas' },
          { id: 'react', label: 'React' },
        ],
      },
      { id: 'nexus', label: 'Nexus' },
      { id: 'atlas', label: 'Atlas' },
    ],
  },
  {
    id: 'areas',
    label: 'Areas',
    children: [
      {
        id: 'health',
        label: 'Health',
        children: [
          { id: 'sleep', label: 'Sleep' },
          { id: 'fitness', label: 'Fitness' },
        ],
      },
      { id: 'finance', label: 'Finance' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    children: [
      { id: 'daily', label: 'Daily' },
      { id: 'ideas', label: 'Ideas' },
    ],
  },
]

export function TreeSurface(): React.JSX.Element {
  const [nodes, setNodes] = useState(TREE_SEED)
  return <Tree nodes={nodes} onChange={setNodes} depth={0} />
}

function Tree({
  nodes,
  onChange,
  depth,
}: {
  nodes: Node[]
  onChange: (next: Node[]) => void
  depth: number
}): React.JSX.Element {
  return (
    <SortableZone
      items={nodes.map((n) => n.id)}
      layout="list"
      onReorder={(a, o) => onChange(reorder(nodes, a, o))}
    >
      <ul className={`ix-tree${depth > 0 ? ' ix-tree-nested' : ''}`}>
        {nodes.map((n) => (
          <TreeNode
            key={n.id}
            node={n}
            depth={depth}
            onChildren={(next) =>
              onChange(nodes.map((x) => (x.id === n.id ? { ...x, children: next } : x)))
            }
          />
        ))}
      </ul>
    </SortableZone>
  )
}

export function ConstraintsSurface(): React.JSX.Element {
  const [items, setItems] = useState(mk(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']))
  const [swap, setSwap] = useState(false)
  const [axisY, setAxisY] = useState(false)
  const [bounded, setBounded] = useState(false)
  const [asyncReject, setAsyncReject] = useState(false)
  const ids = items.map((i) => i.id)

  // Rejects any drop into slot 0 after a simulated delay — exercises the engine's async
  // decide-then-animate path.
  const canReorder = asyncReject
    ? (_a: string, o: string): Promise<boolean> =>
        new Promise((res) => window.setTimeout(() => res(ids.indexOf(o) !== 0), 300))
    : undefined

  const toggles: [string, boolean, (v: boolean) => void][] = [
    ['Swap', swap, setSwap],
    ['Axis Y', axisY, setAxisY],
    ['Bounds', bounded, setBounded],
    ['Async-reject slot 0', asyncReject, setAsyncReject],
  ]

  return (
    <div>
      <div className="ix-toggles">
        {toggles.map(([label, on, set]) => (
          <button
            key={label}
            type="button"
            className={`ix-toggle${on ? ' is-on' : ''}`}
            onClick={() => set(!on)}
          >
            {label}
          </button>
        ))}
      </div>
      <SortableZone
        items={ids}
        swap={swap}
        axis={axisY ? 'y' : undefined}
        bounds={bounded ? 'parent' : undefined}
        canReorder={canReorder}
        onReorder={(a, o) => setItems((x) => (swap ? arraySwap(x, a, o) : reorder(x, a, o)))}
      >
        <ul className="ix-vlist">
          {items.map((it) => (
            <Cell key={it.id} id={it.id} className="ix-row">
              <span>{it.label}</span>
            </Cell>
          ))}
        </ul>
      </SortableZone>
    </div>
  )
}

export function ScrollSurface(): React.JSX.Element {
  const [items, setItems] = useState(mk(Array.from({ length: 20 }, (_, i) => `Row ${i + 1}`)))
  return (
    <SortableZone
      items={items.map((i) => i.id)}
      layout="list"
      onReorder={(a, o) => setItems((x) => reorder(x, a, o))}
    >
      <ul className="ix-vlist ix-scroll">
        {items.map((it) => (
          <Cell key={it.id} id={it.id} className="ix-row">
            <Icon name="circle-dashed" size="body" />
            <span>{it.label}</span>
          </Cell>
        ))}
      </ul>
    </SortableZone>
  )
}

function TreeNode({
  node,
  depth,
  onChildren,
}: {
  node: Node
  depth: number
  onChildren: (next: Node[]) => void
}): React.JSX.Element {
  const { setNodeRef, style, handle, isDragging } = useDragItem(node.id)
  const [open, setOpen] = useState(depth < 1)
  const kids = node.children
  return (
    <li ref={setNodeRef} style={style} className="ix-tree-node">
      {/* biome-ignore lint/a11y/useSemanticElements: a real <button> cannot host this surface — it doubles as a drag handle and wraps block content */}
      <div
        className="ix-tree-row"
        {...handle}
        role="button"
        tabIndex={0}
        onClick={() => !isDragging && kids && setOpen((o) => !o)}
        onKeyDown={onActivateKey(() => kids && setOpen((o) => !o))}
      >
        {kids ? (
          <span className={`ix-caret${open ? ' open' : ''}`}>
            <Icon name="chevron-right" size="body" />
          </span>
        ) : (
          <span className="ix-caret-gap" />
        )}
        <Icon name={kids ? (open ? 'folder-open' : 'folder-closed') : 'file-text'} size="title3" />
        <span>{node.label}</span>
      </div>
      {kids && (
        <div className={`ix-collapse${open ? '' : ' is-collapsed'}`}>
          <div>
            <Tree nodes={kids} onChange={onChildren} depth={depth + 1} />
          </div>
        </div>
      )}
    </li>
  )
}
