import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { bloomOpen, bloomClose } from '@renderer/DesignSystem/Animation/animations.css'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import { useHeld } from '@renderer/DesignSystem/Interactions/useHeld'
import { GlassPane, GlassSurface } from '@renderer/DesignSystem/Glass'
import { MenuScrollFrame } from '@renderer/DesignSystem/Menus/menu-row'
import { markPickerOpen } from '@renderer/DesignSystem/Interactions/useDismiss'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { MENU_GAP as GAP } from '@renderer/DesignSystem/Menus/menu-anchor'
import * as s from './picker-base.css'

const VIEWPORT_MARGIN = 8
const CHECK = 12

const stopPointerBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()
const stopContextBubble = (e: {
  stopPropagation: () => void
  preventDefault: () => void
}): void => {
  e.stopPropagation()
  e.preventDefault()
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const tabStops = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))

export type PickerDirection = 'down' | 'up' | 'left' | 'right'

/** KNOB — how far past the trigger's center the pane's near edge sits, and with it where the Bloom
 *  starts. `MenuSurface` is the one shell that still wears a beak; here the same offset survives as
 *  an origin-only figure, so a pane still zooms out of the point nearest what opened it. */
const ANCHOR_RESERVE = 30

const CORNER_CLEAR = s.PANE_RADIUS + 2

export function PickerMenu({
  children,
  open,
  onDismiss,
  triggerRef,
  closing: closingProp = false,
  solid = false,
  glass = 'surface',
  direction = 'down',
  origin = 'auto',
  anchorX,
  anchorY,
  anchorHeight = 0,
  bounds,
  header,
  footer,
  maxHeight,
  bareSurface = false,
  manageFocus = true,
  contentClassName,
  style,
  onDirection,
}: {
  children: ReactNode
  open?: boolean
  onDismiss?: () => void
  triggerRef?: RefObject<Element | null>
  closing?: boolean
  solid?: boolean
  glass?: 'surface' | 'pane'
  direction?: PickerDirection
  origin?: 'auto' | 'right' | 'center' | 'left'
  anchorX?: number
  anchorY?: number
  anchorHeight?: number
  bounds?: { left: number; right: number }
  header?: ReactNode
  footer?: ReactNode
  maxHeight?: number
  bareSurface?: boolean
  manageFocus?: boolean
  contentClassName?: string
  style?: CSSProperties
  onDirection?: (dir: PickerDirection) => void
}): React.JSX.Element | null {
  const selfManaged = open !== undefined
  const { mounted, closing: exitClosing } = useExitPresence(open ?? true)
  const closing = selfManaged ? exitClosing : closingProp
  useEffect(() => {
    if (!selfManaged || !mounted) return
    return markPickerOpen()
  }, [selfManaged, mounted])
  const liveRef = useRef(false)
  liveRef.current = selfManaged ? (open ?? false) || exitClosing : closingProp
  useEffect(
    () => () => {
      if (import.meta.env.DEV && liveRef.current)
        console.error(
          '[PickerMenu] unmounted while open/exiting — Bloom-out skipped. Mount persistently and ride `open`.',
        )
    },
    [],
  )
  const body = useHeld(children, !closing)

  const paneRef = useRef<HTMLDivElement>(null)
  const glassRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{
    top?: number
    bottom?: number
    right?: number
    left?: number
    origin?: string
    centered?: boolean
  } | null>(null)
  const [effDir, setEffDir] = useState<PickerDirection>(direction)
  const decidedDir = useRef<PickerDirection | null>(null)
  const decidedCenter = useRef<boolean | null>(null)
  if (open === false && decidedDir.current !== null) {
    decidedDir.current = null
    decidedCenter.current = null
  }

  const paneBox = useRef({ w: 0, h: 0 })
  const place = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    const el = glassRef.current
    if (!el) return
    const measure = (): void => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (paneBox.current.w === w && paneBox.current.h === h) return
      paneBox.current = { w, h }
      place.current?.()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  useLayoutEffect(() => {
    // Freeze the pane's position through the Bloom-out: once closing, a trigger that detached or moved
    // (e.g. a pick re-grouped its row) must not re-measure to zeros and snap the fading pane away.
    if (!selfManaged || !mounted || closing) return
    const point =
      anchorX !== undefined && anchorY !== undefined
        ? {
            left: anchorX,
            right: anchorX,
            top: anchorY,
            bottom: anchorY + anchorHeight,
            width: 0,
            height: anchorHeight,
          }
        : null
    const trigger = triggerRef?.current ?? markerRef.current?.parentElement
    const rectOf = point ? () => point : trigger ? () => trigger.getBoundingClientRect() : null
    if (!rectOf) return
    const measure = (): void => {
      const t = rectOf()
      const c = anchorX ?? t.left + t.width / 2
      const edgeL = (bounds?.left ?? 0) + VIEWPORT_MARGIN
      const edgeR = (bounds?.right ?? window.innerWidth) - VIEWPORT_MARGIN
      const { w: pw, h: ph } = paneBox.current
      let eff = decidedDir.current ?? direction
      if (decidedDir.current === null) {
        if (direction === 'up' && t.top - GAP - ph < VIEWPORT_MARGIN) eff = 'down'
        else if (direction === 'left' && t.left - GAP - pw < VIEWPORT_MARGIN) eff = 'down'
        else if (direction === 'right' && t.right + GAP + pw > window.innerWidth - VIEWPORT_MARGIN)
          eff = 'down'
        else if (direction === 'down' && t.bottom + GAP + ph > window.innerHeight - VIEWPORT_MARGIN)
          eff = 'up'
        decidedDir.current = eff
      }
      setEffDir(eff)
      onDirection?.(eff)
      const edge = (along: number, at: number): number =>
        Math.min(Math.max(at, CORNER_CLEAR), Math.max(CORNER_CLEAR, along - CORNER_CLEAR))
      if (eff === 'left' || eff === 'right') {
        const cy = t.top + t.height / 2
        const bottom = Math.max(VIEWPORT_MARGIN, window.innerHeight - cy - ANCHOR_RESERVE)
        const y = edge(ph, ph - ANCHOR_RESERVE)
        if (eff === 'right') setPos({ left: t.right + GAP, bottom, origin: `0px ${y}px` })
        else setPos({ right: window.innerWidth - t.left + GAP, bottom, origin: `${pw}px ${y}px` })
        return
      }
      const near = (x: number): string => `${edge(pw, x)}px ${eff === 'up' ? ph : 0}px`
      const vertical =
        eff === 'up' ? { bottom: window.innerHeight - t.top + GAP } : { top: t.bottom + GAP }
      if (decidedCenter.current === null)
        decidedCenter.current =
          origin === 'center' || (origin === 'auto' && c - pw / 2 >= edgeL && c + pw / 2 <= edgeR)
      if (decidedCenter.current) {
        const half = pw / 2
        const left = Math.min(Math.max(c, edgeL + half), edgeR - half)
        setPos({ ...vertical, left, centered: true, origin: near(c - (left - half)) })
        return
      }
      if (origin === 'left') {
        const left = Math.min(Math.max(edgeL, c - ANCHOR_RESERVE), Math.max(edgeL, edgeR - pw))
        setPos({ ...vertical, left, origin: near(ANCHOR_RESERVE) })
        return
      }
      const iw = window.innerWidth
      const right = Math.min(
        Math.max(iw - edgeR, iw - c - ANCHOR_RESERVE),
        Math.max(iw - edgeR, iw - edgeL - pw),
      )
      setPos({ ...vertical, right, origin: near(pw - ANCHOR_RESERVE) })
    }
    place.current = measure
    measure()
    let raf = 0
    const measureOnFrame = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }
    const ro = new ResizeObserver(measure)
    if (trigger && !point) ro.observe(trigger)
    window.addEventListener('scroll', measureOnFrame, true)
    window.addEventListener('resize', measureOnFrame)
    return () => {
      place.current = null
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', measureOnFrame, true)
      window.removeEventListener('resize', measureOnFrame)
    }
  }, [
    selfManaged,
    mounted,
    triggerRef,
    closing,
    origin,
    direction,
    anchorX,
    anchorHeight,
    bounds,
    anchorY,
    onDirection,
  ])

  useEffect(() => {
    if (!selfManaged || !onDismiss || open !== true || closing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selfManaged, onDismiss, open, closing])

  const managed = selfManaged && manageFocus
  const focusReturn = useRef<HTMLElement | null>(null)
  const tookFocus = useRef(false)
  useLayoutEffect(() => {
    if (!managed || open !== true) return
    const from = document.activeElement
    focusReturn.current =
      from instanceof HTMLElement && !paneRef.current?.contains(from) ? from : null
  }, [managed, open])

  const placed = pos !== null
  useEffect(() => {
    if (!managed || open !== true || closing || !placed || tookFocus.current) return
    tookFocus.current = true
    const pane = paneRef.current
    if (!pane || pane.contains(document.activeElement)) return
    ;(tabStops(pane)[0] ?? pane).focus()
  }, [managed, open, closing, placed])

  useEffect(() => {
    if (!managed || open !== true) return
    return () => {
      tookFocus.current = false
      const back = focusReturn.current
      focusReturn.current = null
      if (!back?.isConnected) return
      const active = document.activeElement
      if (active && active !== document.body && !paneRef.current?.contains(active)) return
      back.focus({ preventScroll: true })
    }
  }, [managed, open])

  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
    const pane = paneRef.current
    if (!pane) return
    const stops = tabStops(pane)
    const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
    if (stops.length > 0 && document.activeElement !== edge && document.activeElement !== pane)
      return
    e.preventDefault()
    ;(e.shiftKey ? stops[stops.length - 1] : stops[0])?.focus()
  }

  const up = effDir === 'up'
  const Shell = glass === 'pane' ? GlassPane : GlassSurface
  const pane = (
    <Shell
      ref={glassRef}
      solid={glass === 'surface' ? solid : undefined}
      className={cx(
        s.pane,
        !bareSurface && s.surface,
        contentClassName,
        closing ? bloomClose : bloomOpen,
      )}
      style={
        {
          ...(pos?.origin ? { '--menu-origin': pos.origin } : null),
          ...style,
          ...(closing ? { pointerEvents: 'none' as const } : null),
        } as CSSProperties
      }
    >
      {maxHeight === undefined && !header && !footer ? (
        body
      ) : (
        <MenuScrollFrame
          maxHeight={maxHeight ?? s.PICKER_MAX_HEIGHT}
          header={header}
          footer={footer}
        >
          {body}
        </MenuScrollFrame>
      )}
    </Shell>
  )

  if (!selfManaged) {
    return <div className={up ? s.anchorUp : s.anchor}>{pane}</div>
  }

  if (!mounted) return null

  return (
    <>
      <span ref={markerRef} aria-hidden style={{ display: 'none' }} />
      {createPortal(
        <>
          {onDismiss && !closing ? (
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-catching backdrop — Escape is the keyboard dismissal
            <div
              className={s.backdrop}
              data-picker-portal
              onPointerDown={stopPointerBubble}
              onContextMenu={stopContextBubble}
              onClick={onDismiss}
            />
          ) : null}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
          <div
            ref={paneRef}
            className={s.layer}
            data-picker-portal
            tabIndex={managed ? -1 : undefined}
            onPointerDown={stopPointerBubble}
            onContextMenu={stopContextBubble}
            onKeyDown={managed ? trapTab : undefined}
            style={{
              ...(pos?.top !== undefined ? { top: `${pos.top}px` } : null),
              ...(pos?.bottom !== undefined ? { bottom: `${pos.bottom}px` } : null),
              ...(pos?.left !== undefined
                ? {
                    left: `${pos.left}px`,
                    ...(pos.centered ? { transform: 'translateX(-50%)' } : null),
                  }
                : pos?.right !== undefined
                  ? { right: `${pos.right}px` }
                  : null),
              ...(pos ? null : { top: '0' }),
              visibility: pos ? undefined : 'hidden',
            }}
          >
            {pane}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

export function PointMenu({
  at,
  onDismiss,
  children,
}: {
  at: { x: number; y: number } | null
  onDismiss: () => void
  children: ReactNode
}): React.JSX.Element {
  const point = useHeld(at, at !== null)
  return (
    <PickerMenu
      solid
      open={at !== null}
      onDismiss={onDismiss}
      anchorX={point?.x ?? 0}
      anchorY={point?.y ?? 0}
      origin="center"
    >
      {children}
    </PickerMenu>
  )
}

export function PickerOption({
  children,
  onClick,
  selected = false,
  ring = false,
  leading,
  align,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  ring?: boolean
  leading?: ReactNode
  align?: 'start' | 'center'
}): React.JSX.Element {
  const readsLeft = align === 'start' || (align !== 'center' && leading != null)
  return (
    <button
      type="button"
      className={cx(s.option, selected && s.optionSelected, selected && ring && s.optionRing)}
      onClick={onClick}
    >
      <span className={readsLeft ? s.leadingRow : s.centeredRow}>
        {leading != null && <span className={s.optionGlyph}>{leading}</span>}
        {children}
      </span>
      <Icon
        name="check"
        size={CHECK}
        className={cx(s.optionCheck, !selected && s.optionCheckHidden)}
      />
    </button>
  )
}
