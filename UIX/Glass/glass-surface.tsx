import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { frostStyle, notchGeometry, NOTCH_H, SURFACE_FROST, WINDOW_FROST } from './glass-base'
import { shadowStandardVar } from '../Theme/color.css'
import { PURE_WHITE } from '../Theme/colors'
import { cx } from '../Utilities/cx'

/** `insetRight` omitted = centered. `animationClass` rides the frost and the outline together, never a shared wrapper — an opacity-animated ancestor becomes the frost's backdrop root and samples nothing. */
interface NotchOptions {
  insetRight?: number
  animationClass?: string
}

/** The standard menu glass — clear, a step dimmer than a pane. */
export function GlassSurface({
  children,
  style,
  solid = false,
  notch,
  className,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
  /** For a pane opening OVER another, where clear glass on clear glass leaves the rows underneath reading through. */
  solid?: boolean
  notch?: NotchOptions
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const frost = frostStyle(solid ? WINDOW_FROST : SURFACE_FROST)
  if (!notch) {
    return (
      <div className={className} style={{ ...frost, ...style }} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <NotchedGlass frost={frost} notch={notch} style={style} className={className} {...rest}>
      {children}
    </NotchedGlass>
  )
}

function NotchedGlass({
  children,
  frost,
  notch,
  style,
  className,
  ...rest
}: {
  frost: CSSProperties
  notch: NotchOptions
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const popRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const measured = useRef(size)
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el) return
    // The RO fires every frame while content animates; only a changed integral size re-renders.
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
  const { d, originX } = useMemo(
    () => (ready ? notchGeometry(w, h, notch.insetRight) : { d: '', originX: w / 2 }),
    [w, h, ready, notch.insetRight],
  )
  const anim = notch.animationClass

  return (
    <div
      ref={popRef}
      style={
        {
          position: 'relative',
          width: 'fit-content',
          ...(ready && { '--menu-origin': `${originX}px 0px`, '--notch-h': `${NOTCH_H}px` }),
        } as CSSProperties
      }
    >
      <div
        className={cx(className, anim)}
        // A rect border can't trace a beak, so the SVG frame carries the edge and shadow instead.
        style={{
          ...frost,
          border: 'none',
          boxShadow: 'none',
          ...(d ? { clipPath: `path('${d}')` } : null),
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
      {d && (
        <svg
          className={anim}
          width={w}
          height={h}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 1,
            filter: `drop-shadow(${shadowStandardVar})`,
          }}
        >
          <path
            d={d}
            fill="none"
            strokeWidth={1}
            // Known outlier: a pure-white frost edge, deliberately brighter than the palette's system-white.
            stroke={PURE_WHITE}
            strokeOpacity={SURFACE_FROST.borderAlpha}
          />
        </svg>
      )}
    </div>
  )
}
