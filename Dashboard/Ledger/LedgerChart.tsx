import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { type Band, dayLabel, fmt, sum } from './ledgerModel'

export type Window = { lo: number; hi: number }

// KNOBS — the drawing box and its margins; the right margin holds the direct labels.
const W = 940
const H = 380
const M = { t: 12, r: 172, b: 26, l: 46 }
const IW = W - M.l - M.r
const IH = H - M.t - M.b
export const MIN_SPAN = 3
const LABEL_GAP = 15

export function clampWindow({ lo, hi }: Window, last: number): Window {
  const span = Math.min(Math.max(hi - lo, MIN_SPAN), last)
  const start = Math.max(0, Math.min(lo, last - span))
  return { lo: start, hi: start + span }
}

export function zoomed(w: Window, last: number, factor: number, focus = (w.lo + w.hi) / 2): Window {
  const span = w.hi - w.lo
  const next = Math.min(Math.max(span * factor, MIN_SPAN), last)
  const f = Math.min(Math.max(focus, w.lo), w.hi)
  const t = span === 0 ? 0.5 : (f - w.lo) / span
  return clampWindow({ lo: f - t * next, hi: f - t * next + next }, last)
}

type Hover = { i: number; clientX: number }

/** A stacked area chart over `values` (one row per day, one column per band), windowed and hoverable. */
export function LedgerChart({
  dates,
  values,
  bands,
  window: win,
  onWindow,
}: {
  dates: string[]
  values: number[][]
  bands: Band[]
  window: Window
  onWindow: (next: Window) => void
}): React.JSX.Element {
  const last = dates.length - 1
  const { lo, hi } = win
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ px: number; from: Window } | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [dragging, setDragging] = useState(false)

  const x = (i: number): number => M.l + ((i - lo) / (hi - lo)) * IW
  const iAt = (px: number): number => lo + ((px - M.l) / IW) * (hi - lo)
  const svgX = (clientX: number): number => {
    const r = svgRef.current!.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * W
  }

  const i0 = Math.max(0, Math.floor(lo))
  const i1 = Math.min(last, Math.ceil(hi))
  const totals = values.map(sum)
  const visMax = Math.max(...totals.slice(i0, i1 + 1))
  const step = visMax > 30000 ? 10000 : visMax > 12000 ? 5000 : 2000
  const yMax = Math.ceil(visMax / step) * step
  const y = (v: number): number => M.t + IH - (v / yMax) * IH

  // Cumulative upper edge of each band, bottom of the stack first.
  const edges = bands.map((_, k) => values.map((row) => sum(row.slice(0, k + 1))))
  const lowerOf = (k: number, i: number): number => (k === 0 ? 0 : edges[k - 1][i])

  const paths = bands.map((band, k) => {
    let d = `M${x(i0)},${y(edges[k][i0])}`
    for (let i = i0 + 1; i <= i1; i++) d += `L${x(i)},${y(edges[k][i])}`
    for (let i = i1; i >= i0; i--) d += `L${x(i)},${y(lowerOf(k, i))}`
    return <path key={band.name} d={`${d}Z`} fill={band.color} className="lg-band" />
  })

  const gridValues: number[] = []
  for (let v = 0; v <= yMax; v += step) gridValues.push(v)

  const ticks = [...new Set([0, 1, 2, 3, 4].map((n) => Math.round(lo + ((hi - lo) * n) / 4)))]

  // Direct labels at the right edge, nudged apart so none collide.
  const rightI = Math.round(hi)
  const seats = bands
    .map((band, k) => ({ band, k, y: (y(edges[k][rightI]) + y(lowerOf(k, rightI))) / 2 }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < seats.length; i++) {
    if (seats[i].y - seats[i - 1].y < LABEL_GAP) seats[i].y = seats[i - 1].y + LABEL_GAP
  }

  // A trackpad pinch arrives as a ctrlKey wheel; a plain wheel is left to scroll the page. React's wheel listener is passive, so the native one takes it.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      onWindow(zoomed(win, last, e.deltaY > 0 ? 1.15 : 1 / 1.15, iAt(svgX(e.clientX))))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  })

  // The tip is placed against measured widths, so it is written to the node rather than round-tripped through state.
  useLayoutEffect(() => {
    const tip = tipRef.current
    const wrap = wrapRef.current
    if (!tip || !wrap || !hover) return
    const wr = wrap.getBoundingClientRect()
    const px = hover.clientX - wr.left
    tip.style.left = `${Math.max(4, Math.min(px + 16, wr.width - tip.offsetWidth - 4))}px`
  }, [hover])

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>): void => {
    if (drag.current) {
      const r = svgRef.current!.getBoundingClientRect()
      const { px, from } = drag.current
      const shift = ((((e.clientX - px) / r.width) * W) / IW) * (from.hi - from.lo)
      setHover(null)
      onWindow(clampWindow({ lo: from.lo - shift, hi: from.hi - shift }, last))
      return
    }
    const vx = svgX(e.clientX)
    if (vx < M.l - 8 || vx > M.l + IW + 8) {
      setHover(null)
      return
    }
    setHover({ i: Math.max(0, Math.min(last, Math.round(iAt(vx)))), clientX: e.clientX })
  }

  return (
    <div className="lg-chart-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={cx('lg-chart', dragging && 'dragging')}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Stacked area chart of Pommora's code lines by system over time."
        onPointerDown={(e) => {
          drag.current = { px: e.clientX, from: win }
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          drag.current = null
          setDragging(false)
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id="lg-clip">
            <rect x={M.l} y={M.t} width={IW} height={IH} />
          </clipPath>
        </defs>
        <g className="lg-grid">
          {gridValues.map((v) => (
            <line key={v} x1={M.l} x2={M.l + IW} y1={y(v)} y2={y(v)} />
          ))}
        </g>
        <g clipPath="url(#lg-clip)">{[...paths].reverse()}</g>
        <g className="lg-axis">
          {gridValues.map((v) => (
            <text key={v} x={M.l - 9} y={y(v) + 3} textAnchor="end">
              {v === 0 ? '0' : v >= 1000 ? `${v / 1000}k` : String(v)}
            </text>
          ))}
          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={i <= lo + 0.01 ? 'start' : i >= hi - 0.01 ? 'end' : 'middle'}
            >
              {dayLabel(dates[i])}
            </text>
          ))}
        </g>
        {seats.map((s) => (
          <g key={s.band.name}>
            <rect x={M.l + IW + 12} y={s.y - 4.5} width={9} height={9} rx={2} fill={s.band.color} />
            <text x={M.l + IW + 26} y={s.y + 3.5} className="lg-lbl">
              {s.band.name} {fmt(values[rightI][s.k])}
            </text>
          </g>
        ))}
        {hover && (
          <line className="lg-crosshair" x1={x(hover.i)} x2={x(hover.i)} y1={M.t} y2={M.t + IH} />
        )}
      </svg>
      <div ref={tipRef} className={cx('lg-tip', hover !== null && 'on')}>
        {hover && (
          <>
            <span className="lg-when">{dates[hover.i]}</span>
            {[...bands].reverse().map((band, r) => {
              const k = bands.length - 1 - r
              return (
                <div className="lg-r" key={band.name}>
                  <span className="lg-sw" style={{ background: band.color }} />
                  <span>{band.name}</span>
                  <span>{fmt(values[hover.i][k])}</span>
                </div>
              )
            })}
            <div className="lg-tot">
              <span>Total</span>
              <b>{fmt(totals[hover.i])}</b>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
