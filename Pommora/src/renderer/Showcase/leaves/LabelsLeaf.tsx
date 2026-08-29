import { useState, type ReactNode } from 'react'
import { vars } from '@renderer/DesignSystem/Tokens'
import {
  SpaceChip,
  FileChip,
  FileLabel,
  fill,
  labelColor,
  Label,
  roomy,
  shape,
  textCap,
} from '@renderer/DesignSystem/Labels'
import { DualSwitch } from '@renderer/DesignSystem/Controls/Switches/DualSwitch'
import { SortableZone, useDragItem, reorder } from '@renderer/DesignSystem/Interactions/drag'
import type { LabelColorName } from '@renderer/DesignSystem/Labels'
import { ANCHOR_CELLS, cellColor } from '@renderer/DesignSystem/Tokens/ramp'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollUnmasked } from '@renderer/DesignSystem/Interactions/OverScroll'
import { humanize, useIsCompact } from './helpers'

// The demo rows show one chip per SPECTRUM anchor rather than all 64 cells — the ramp's shape is the
// picker's story, not the chip shapes'.
const CHIP_COLORS: LabelColorName[] = [...Object.values(ANCHOR_CELLS), 'default', 'accent']
const pillClass = (color: LabelColorName): string => `${shape.pill} ${labelColor[color]}`

function ChipCell({
  id,
  color,
  label,
}: {
  id: string
  color: LabelColorName
  label: string
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return (
    <span ref={setNodeRef} style={style} className={pillClass(color)} {...handle} title={color}>
      <span className={cx(textCap, overScrollUnmasked)}>{label}</span>
    </span>
  )
}

// Pills are static on a compact screen so the page scrolls (drag sets touch-action:none).
function PillRow(): React.JSX.Element {
  const [items, setItems] = useState(() => CHIP_COLORS.map((c) => ({ id: c, name: humanize(c) })))
  const compact = useIsCompact()
  const cells = (
    <div className="ds-chip-row-items">
      {items.map((it) =>
        compact ? (
          <span key={it.id} className={pillClass(it.id)} title={it.id}>
            <span className={cx(textCap, overScrollUnmasked)}>{it.name}</span>
          </span>
        ) : (
          <ChipCell key={it.id} id={it.id} color={it.id} label={it.name} />
        ),
      )}
    </div>
  )
  if (compact) return cells
  return (
    <SortableZone
      items={items.map((i) => i.id)}
      layout="grid"
      getItemLabel={(id) => items.find((i) => i.id === id)?.name ?? id}
      onReorder={(a, o) => setItems((x) => reorder(x, a, o))}
    >
      {cells}
    </SortableZone>
  )
}

const SHAPE_ROWS: Array<{ label: string; shape: string; content: () => ReactNode }> = [
  {
    label: 'Tag',
    shape: shape.tag,
    content: () => <span className={cx(textCap, overScrollUnmasked)}>Label</span>,
  },
  {
    label: 'Context · tag + neutral fill',
    shape: cx(shape.tag, fill.neutral, roomy),
    content: () => <span className={cx(textCap, overScrollUnmasked)}>Context</span>,
  },
]

function ShapeRow({
  rowId,
  shape,
  content,
}: {
  rowId: string
  shape: string
  content: () => ReactNode
}): React.JSX.Element {
  const [order, setOrder] = useState<LabelColorName[]>(() => [...CHIP_COLORS])
  const compact = useIsCompact()
  const cells = (
    <div className="ds-chip-row-items">
      {order.map((k) =>
        compact ? (
          <span key={k} className={cx(shape, labelColor[k])} title={k}>
            {content()}
          </span>
        ) : (
          <ShapeCell key={k} id={`${rowId}:${k}`} className={cx(shape, labelColor[k])} title={k}>
            {content()}
          </ShapeCell>
        ),
      )}
    </div>
  )
  if (compact) return cells
  return (
    <SortableZone
      items={order.map((k) => `${rowId}:${k}`)}
      layout="grid"
      getItemLabel={(id) => id.split(':')[1]}
      onReorder={(a, o) =>
        setOrder((x) =>
          reorder(
            x.map((k) => ({ id: `${rowId}:${k}` })),
            a,
            o,
          ).map(({ id }) => id.split(':')[1] as LabelColorName),
        )
      }
    >
      {cells}
    </SortableZone>
  )
}

function ShapeCell({
  id,
  className,
  title,
  children,
}: {
  id: string
  className: string
  title: string
  children: ReactNode
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return (
    <span ref={setNodeRef} style={style} className={className} {...handle} title={title}>
      {children}
    </span>
  )
}

function SwitchDemo({ color }: { color: LabelColorName }): React.JSX.Element {
  const [on, setOn] = useState(true)
  const solid =
    color === 'default'
      ? vars.color.solid.greyDefault
      : color === 'accent'
        ? 'var(--system-accent)'
        : cellColor(color)
  return (
    <span
      className="ds-switch-demo"
      title={color}
      style={{ '--accent': solid } as React.CSSProperties}
    >
      <DualSwitch checked={on} onChange={setOn} ariaLabel={color} />
    </span>
  )
}

const PENDING = ['Separator', 'Row']

/** The two colorless shapes, which the shape rows can't show: those fan a shape across every chip
 *  color, and a file carries none of its own — its name and its type glyph are the whole content. */
const FILE_SHAPES: Array<{ label: string; content: ReactNode }> = [
  { label: 'File · a file property’s value', content: <FileChip name="Q3 Report.pdf" /> },
  { label: 'Plain · a name inside a field', content: <FileLabel name="Meeting Notes.md" /> },
]

/** Every removable label, since the melt is the one state a shape row can't show. */
function RemovableRow(): React.JSX.Element {
  const [gone, setGone] = useState<string[]>([])
  const drop = (k: string) => () => setGone((g) => [...g, k])
  const live = (k: string) => !gone.includes(k)
  return (
    <div className="ds-chip-row-items">
      {live('pill') && (
        <Label shape="pill" color="blue-4" text="Removable pill" onRemove={drop('pill')} />
      )}
      {live('tag') && (
        <Label shape="tag" color="green-4" text="Removable tag" onRemove={drop('tag')} />
      )}
      {live('context') && (
        <SpaceChip color="purple-4" title="Removable context" onRemove={drop('context')} />
      )}
      {live('file') && <FileChip name="Removable file.pdf" onRemove={drop('file')} />}
      {live('plain') && <FileLabel name="Removable name.md" onRemove={drop('plain')} />}
    </div>
  )
}

export function LabelsLeaf(): React.JSX.Element {
  return (
    <div className="ds-leaf">
      <section className="ds-section">
        <h2>Labels</h2>
        <div className="ds-chip-grid">
          <div className="ds-chip-row">
            <div className="ds-chip-rowlabel">Pill · drag to reorder</div>
            <PillRow />
          </div>
          {SHAPE_ROWS.map((shape) => (
            <div className="ds-chip-row" key={shape.label}>
              <div className="ds-chip-rowlabel">{shape.label}</div>
              <ShapeRow rowId={shape.label} shape={shape.shape} content={shape.content} />
            </div>
          ))}
          <div className="ds-chip-row">
            <div className="ds-chip-rowlabel">Removable · hover the right third</div>
            <RemovableRow />
          </div>
          {FILE_SHAPES.map((s) => (
            <div className="ds-chip-row" key={s.label}>
              <div className="ds-chip-rowlabel">{s.label}</div>
              <div className="ds-chip-row-items">{s.content}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2>Switches</h2>
        <div className="ds-chip-row-items">
          {CHIP_COLORS.map((c) => (
            <SwitchDemo key={c} color={c} />
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2>Components · Coming soon</h2>
        <div className="ds-pending">
          {PENDING.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
