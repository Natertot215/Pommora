import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { GlassSurface, SURFACE_FROST } from '../Glass'
import { cx } from '../Util/cx'
import * as s from './menu-shell.css'

const NOTCH_W = 34
const NOTCH_H = 8
const NOTCH_CURVE = 0.25

// One path serves as both the frost clip and the SVG outline — a rect border can't trace a beak.
function panePath(w: number, h: number, nx: number): string {
  const r = s.BEAK_RADIUS
  const half = NOTCH_W / 2
  const xL = nx - half
  const xR = nx + half
  const cb = Math.min(half * (0.3 + NOTCH_CURVE), half)
  const ct = Math.min(half * (0.15 + NOTCH_CURVE), half * 0.9)
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

/** `notchInsetRight` aims the beak from the pane's right edge; omitted = centered. */
export function NotchedShell({
  children,
  className,
  animationClass,
  notchInsetRight,
}: {
  children: ReactNode
  className?: string
  animationClass?: string
  notchInsetRight?: number
}): React.JSX.Element {
  const popRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const measured = useRef(size)
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el) return
    // The RO fires every frame while content animates its height; only a changed integral size re-renders.
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
  const { d, n } = useMemo(() => {
    const nMin = s.BEAK_RADIUS + NOTCH_W / 2 + 2
    const nMax = w - s.BEAK_RADIUS - NOTCH_W / 2 - 2
    const nRaw = notchInsetRight !== undefined ? w - notchInsetRight : w / 2
    const pos = nMin < nMax ? Math.min(Math.max(nRaw, nMin), nMax) : w / 2
    return { d: ready ? panePath(w, h, pos) : '', n: pos }
  }, [w, h, ready, notchInsetRight])

  return (
    // The Bloom class goes on the pane and frame, never this wrapper: an opacity-animated ancestor
    // becomes the frost's backdrop root and the backdrop-filter samples nothing.
    <div
      ref={popRef}
      className={s.pop}
      style={
        ready
          ? ({ '--menu-origin': `${n}px 0px`, '--notch-h': `${NOTCH_H}px` } as CSSProperties)
          : undefined
      }
    >
      <GlassSurface
        className={cx(className, animationClass)}
        style={{
          border: 'none',
          boxShadow: 'none',
          ...(d ? { clipPath: `path('${d}')` } : null),
        }}
      >
        {children}
      </GlassSurface>
      {d && (
        <svg className={cx(s.frame, animationClass)} width={w} height={h} aria-hidden="true">
          <path
            d={d}
            fill="none"
            strokeWidth={1}
            // Known outlier: a pure-white frost edge, deliberately brighter than the palette's system-white.
            stroke="#FFFFFF"
            strokeOpacity={SURFACE_FROST.borderAlpha}
          />
        </svg>
      )}
    </div>
  )
}
