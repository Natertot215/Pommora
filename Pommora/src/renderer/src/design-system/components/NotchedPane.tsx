import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { GlassPane, PANE_FROST } from '../materials'
import { cx } from '../cx'
import * as s from './notchedPane.css'

// The beak geometry. Fixed, not props: one shell wears a beak — the large toolbar dropdown — and it
// wears the same one every time.
const NOTCH_W = 34
const NOTCH_H = 8
const NOTCH_CURVE = 0.25

// The notch is ONE path used both as the frost clip-path and the SVG border stroke — shape + outline
// are the same line. The beak is the Apple-popover silhouette: one cubic per side, tangent to the
// top edge at its base and horizontal over the apex — a smooth fillet into a rounded crest, no
// straight slopes, no tip vertex.
function panePath(w: number, h: number, nx: number): string {
  const r = s.BEAK_RADIUS
  const half = NOTCH_W / 2
  const xL = nx - half
  const xR = nx + half
  const cb = Math.min(half * (0.3 + NOTCH_CURVE), half) // base tangent run (fillet width)
  const ct = Math.min(half * (0.15 + NOTCH_CURVE), half * 0.9) // apex tangent run (crest roundness)
  return [
    `M ${r} ${NOTCH_H}`,
    `L ${xL} ${NOTCH_H}`,
    `C ${xL + cb} ${NOTCH_H} ${nx - ct} 0 ${nx} 0`,
    `C ${nx + ct} 0 ${xR - cb} ${NOTCH_H} ${xR} ${NOTCH_H}`,
    `L ${w - r} ${NOTCH_H}`,
    `Q ${w} ${NOTCH_H} ${w} ${NOTCH_H + r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${NOTCH_H + r}`,
    `Q 0 ${NOTCH_H} ${r} ${NOTCH_H}`,
    'Z',
  ].join(' ')
}

/**
 * The beaked shell behind the large toolbar dropdown: a GlassPane whose frost is clipped to a
 * rounded rect with a top beak, outlined by an SVG stroke of the SAME path. A rect border can't
 * trace a beak, which is the whole reason the outline is drawn by hand here — every pane that
 * doesn't wear one mounts `GlassPane` directly and keeps the material's own border and shadow.
 *
 * Publishes `--notch-h` so a surface's gutter can clear the beak band, and points
 * `--dropdown-origin` at the beak tip so the Bloom starts from it. `notchInsetRight` aims the beak
 * (measured from the pane's right edge); omitted = centered.
 */
export function NotchedPane({
  children,
  className,
  animationClass,
  notchInsetRight,
}: {
  children: ReactNode
  /** The surface's own classes (gutter/layout) — applied to the GlassPane. */
  className?: string
  /** The open/close Bloom class — applied to the measured wrapper so pane + frame animate as one. */
  animationClass?: string
  notchInsetRight?: number
}): React.JSX.Element {
  const popRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const measured = useRef(size)
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el) return
    // Bail on unchanged sizes: the RO fires every frame while pane content animates its height, and
    // everything past this line — a re-render, a re-serialized path — is wasted on frames where
    // nothing moved. offsetWidth/Height are integral, so jitter can't defeat it.
    const measure = (): void => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (measured.current.w === w && measured.current.h === h) return
      measured.current = { w, h }
      setSize(measured.current)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const ready = w > 0 && h > 0
  // Clamp the beak clear of the corner radii so it can't break the outline. Path + beak position are
  // memoized: a re-render without a geometry change (parent state, hover) must not re-serialize the
  // cubic path string.
  const { d, n } = useMemo(() => {
    const nMin = s.BEAK_RADIUS + NOTCH_W / 2 + 2
    const nMax = w - s.BEAK_RADIUS - NOTCH_W / 2 - 2
    const nRaw = notchInsetRight !== undefined ? w - notchInsetRight : w / 2
    const pos = nMin < nMax ? Math.min(Math.max(nRaw, nMin), nMax) : w / 2
    return { d: ready ? panePath(w, h, pos) : '', n: pos }
  }, [w, h, ready, notchInsetRight])

  return (
    // The Bloom class rides the pane + frame INDIVIDUALLY (same keyframes + origin var → one move),
    // never this wrapper: an opacity-animated ancestor becomes the frost's backdrop root and the
    // backdrop-filter silently samples nothing.
    <div
      ref={popRef}
      className={s.pop}
      style={
        ready
          ? ({ '--dropdown-origin': `${n}px 0px`, '--notch-h': `${NOTCH_H}px` } as CSSProperties)
          : undefined
      }
    >
      <GlassPane
        className={cx(className, animationClass)}
        style={{
          border: 'none',
          boxShadow: 'none',
          ...(d ? { clipPath: `path('${d}')` } : null),
        }}
      >
        {children}
      </GlassPane>
      {d && (
        <svg className={cx(s.frame, animationClass)} width={w} height={h} aria-hidden="true">
          <path
            d={d}
            fill="none"
            strokeWidth={1}
            stroke="#FFFFFF"
            strokeOpacity={PANE_FROST.borderAlpha}
          />
        </svg>
      )}
    </div>
  )
}
