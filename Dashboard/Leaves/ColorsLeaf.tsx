import { useState, type CSSProperties } from 'react'
import { vars, tintAt, TINT_STEPS } from '@pommora/uix/Theme'
import { shape, tinted } from '@pommora/uix/Labels/label-base.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { applySystemAccent, readCssAccentColor, solidColorCss } from '@pommora/uix/Theme/ramp'
import { SOLID_COLORS, type AccentSetting } from '@pommora/uix/Theme/colors'
import { humanize, formatColor, useComputedStyleText, useIsCompact } from './helpers'

const ACCENT_CHIP = { '--label-base': 'var(--accent)' } as CSSProperties

// Accent is excluded from the static groups below — it has its own live picker.
const PRIMITIVE_GROUP: [string, Record<string, string>] = ['Primitives', vars.color.system]
const COLOR_GROUPS: Array<[string, Record<string, string>]> = [
  ['Solid spectrum', vars.color.solid],
  ['Label', vars.color.label],
  ['Background', vars.color.background],
  ['Surface', vars.color.surface],
  ['Fills', vars.color.fill],
  ['States', vars.color.state],
  ['Borders', vars.color.border],
]

type SwatchItem = { id: string; name: string; color: string }

// Drag bindings sit on the outer node, distinct from the read-back ref on the inner
// chip, so the two never collide.
function SwatchView({
  name,
  color,
  dragRef,
  style,
  handle,
}: {
  name: string
  color: string
  dragRef?: (el: HTMLDivElement | null) => void
  style?: CSSProperties
  handle?: Record<string, unknown>
}): React.JSX.Element {
  const [ref, hex] = useComputedStyleText<HTMLDivElement>((cs) => formatColor(cs.backgroundColor))
  return (
    <div ref={dragRef} style={style} className="ds-swatch" {...handle}>
      <div ref={ref} className="ds-swatch-chip" style={{ background: color }} />
      <div className="ds-swatch-meta">
        <div className="ds-swatch-name">{name}</div>
        <div className="ds-swatch-hex">{hex}</div>
      </div>
    </div>
  )
}

function SwatchDraggable({ id, name, color }: SwatchItem): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return <SwatchView name={name} color={color} dragRef={setNodeRef} style={style} handle={handle} />
}

// Static on a compact screen so the page scrolls (drag sets touch-action:none).
function SwatchGroup({
  label,
  group,
}: {
  label: string
  group: Record<string, string>
}): React.JSX.Element {
  const [items, setItems] = useState<SwatchItem[]>(() =>
    Object.entries(group).map(([n, c]) => ({ id: n, name: humanize(n), color: c })),
  )
  const compact = useIsCompact()
  const cells = (
    <div className={`ds-swatches${compact ? '' : ' ds-swatches-drag'}`}>
      {items.map((it) =>
        compact ? (
          <SwatchView key={it.id} name={it.name} color={it.color} />
        ) : (
          <SwatchDraggable key={it.id} id={it.id} name={it.name} color={it.color} />
        ),
      )}
    </div>
  )
  return (
    <section className="ds-section">
      <h2>{`Color · ${label}`}</h2>
      {compact ? (
        cells
      ) : (
        <SortableZone
          items={items.map((i) => i.id)}
          label={(id) => items.find((i) => i.id === id)?.name ?? id}
          onMove={(id, beforeId) => setItems((x) => moveBefore(x, (i) => i.id, id, beforeId) ?? x)}
        >
          {cells}
        </SortableZone>
      )}
    </section>
  )
}

const ACCENT_OPTIONS: AccentSetting[] = [...SOLID_COLORS, 'system']

function AccentDemo(): React.JSX.Element {
  const [active, setActive] = useState<AccentSetting>('lavender')
  const [systemColor] = useState(() => readCssAccentColor())
  const pick = (a: AccentSetting): void => {
    setActive(a)
    const root = document.documentElement.style
    if (a === 'system') {
      applySystemAccent(systemColor)
      root.removeProperty('--accent')
    } else root.setProperty('--accent', solidColorCss(a))
  }
  return (
    <section className="ds-section">
      <h2>Color · Accent</h2>
      <div className="ds-accent">
        <div className="ds-accent-swatches">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              className={
                'ds-accent-chip' +
                (a === active ? ' is-active' : '') +
                (a === 'system' ? ' is-system' : '')
              }
              style={{
                background:
                  a === 'system' ? (systemColor ?? vars.color.solid.grey) : solidColorCss(a),
              }}
              onClick={() => pick(a)}
              title={a}
              aria-label={a}
            />
          ))}
        </div>
        <div className="ds-accent-samples">
          <span className="ds-accent-btn">Accent button</span>
          <span className={cx(shape.pill, tinted)} style={ACCENT_CHIP}>
            Accent
          </span>
          <span className="ds-accent-link">Accent text</span>
        </div>
      </div>
    </section>
  )
}

const TINT_ORDER = Object.keys(TINT_STEPS) as (keyof typeof TINT_STEPS)[]

// A row's contents — the name and its swatch across every step; the draggable row and the compact list wear the same set.
function TintCells({ name, color }: { name: string; color: string }): React.JSX.Element {
  return (
    <>
      <span className="ds-tint-rowlabel">{humanize(name)}</span>
      {TINT_ORDER.map((k) => (
        <span
          key={k}
          className="ds-tint-swatch"
          style={{ background: tintAt(color, k) }}
          title={`${name} · ${k} ${TINT_STEPS[k]}%`}
        />
      ))}
    </>
  )
}

function TintRow({ name, color }: { name: string; color: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(name)
  return (
    <div ref={setNodeRef} style={style} className="ds-tint-row" {...handle}>
      <TintCells name={name} color={color} />
    </div>
  )
}

function TintScale(): React.JSX.Element {
  const [colors, setColors] = useState(() => Object.entries(vars.color.solid))
  const compact = useIsCompact()
  const rows = compact ? (
    colors.map(([name, color]) => (
      <div className="ds-tint-row" key={name}>
        <TintCells name={name} color={color} />
      </div>
    ))
  ) : (
    <SortableZone
      items={colors.map(([n]) => n)}
      label={(id) => humanize(id)}
      onMove={(id, beforeId) => setColors((x) => moveBefore(x, ([n]) => n, id, beforeId) ?? x)}
    >
      {colors.map(([name, color]) => (
        <TintRow key={name} name={name} color={color} />
      ))}
    </SortableZone>
  )
  return (
    <section className="ds-section">
      <h2>Color · Tints</h2>
      <div className="ds-tints">
        <div className="ds-tint-row ds-tint-head">
          <span className="ds-tint-rowlabel" />
          {TINT_ORDER.map((k) => (
            <span key={k} className="ds-tint-steplabel">
              {k} · {TINT_STEPS[k]}%
            </span>
          ))}
        </div>
        {rows}
      </div>
    </section>
  )
}

export function ColorsLeaf(): React.JSX.Element {
  return (
    <div className="ds-leaf">
      <SwatchGroup label={PRIMITIVE_GROUP[0]} group={PRIMITIVE_GROUP[1]} />
      {COLOR_GROUPS.map(([label, group]) => (
        <SwatchGroup key={label} label={label} group={group} />
      ))}
      <TintScale />
      <AccentDemo />
    </div>
  )
}
