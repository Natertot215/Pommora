import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react'
import './drop-chrome.css'
import { resolveScroller, type ScrollAxis, startAutoScroll } from './autoscroll'
import { ACTIVATION, EDITABLE_TARGETS, suppressNextClick, suppressReleaseClick } from './shared'

const SLOP = 12
const CONTROLS = 'button, a[href], select, [data-drag-slop]'
const GRABBING = 'data-grabbing'

export type PointerGestureSpec = {
  el: HTMLElement
  event: ReactPointerEvent | PointerEvent
  activation?: number | 'item'
  capture?: boolean
  cursor?: 'grabbing'
  autoScroll?: { from: HTMLElement; axis: ScrollAxis }
  onActivate?: (e: PointerEvent) => boolean | undefined
  onDragMove: (e: PointerEvent) => void
  onDrop: () => void
  onTap?: () => void
  onAbort?: () => void
  teardown?: () => void
  onWindowScroll?: (target: EventTarget | null) => void
  scrollTarget?: () => Element | null
}

export type GestureHandle = { abort: () => void; autoScroll: (on: boolean) => void }

function itemActivation(target: EventTarget | null, handle: EventTarget | null): number | null {
  if (!(target instanceof Element) || !(handle instanceof Element)) return ACTIVATION
  const inside = (selector: string, orOn: boolean): boolean => {
    const hit = target.closest(selector)
    return hit !== null && (orOn || hit !== handle) && handle.contains(hit)
  }
  if (inside(EDITABLE_TARGETS, false)) return null
  return inside(CONTROLS, true) ? SLOP : ACTIVATION
}

export function scrollMoved(target: EventTarget | null, el: Element | null | undefined): boolean {
  return !(target instanceof Element) || !el || target.contains(el)
}

type LiveGesture = {
  spec: PointerGestureSpec
  active: boolean
  scroll: (on: boolean) => void
  handlers: {
    move: (e: PointerEvent) => void
    up: (e: PointerEvent) => void
    cancel: (e?: PointerEvent) => void
    key: (e: KeyboardEvent) => void
    blur: () => void
    scroll: (e: Event) => void
  }
}

let live: LiveGesture | null = null

export const gestureLive = (): boolean => live?.active === true

function detach(g: LiveGesture): void {
  window.removeEventListener('pointermove', g.handlers.move)
  window.removeEventListener('pointerup', g.handlers.up)
  window.removeEventListener('pointercancel', g.handlers.cancel)
  window.removeEventListener('blur', g.handlers.blur)
  window.removeEventListener('scroll', g.handlers.scroll, { capture: true })
  window.removeEventListener('keydown', g.handlers.key, { capture: true })
  g.scroll(false)
  if (g.active && g.spec.cursor) g.spec.el.removeAttribute(GRABBING)
  try {
    g.spec.el.releasePointerCapture(g.spec.event.pointerId)
  } catch {}
  try {
    g.spec.teardown?.()
  } catch (err) {
    console.error(err)
  } finally {
    live = null
  }
}

export function beginPointerGesture(spec: PointerGestureSpec): GestureHandle | null {
  const e = spec.event
  if (live || e.button !== 0 || !e.isPrimary) return null
  const threshold =
    spec.activation === 'item'
      ? itemActivation(e.target, e.currentTarget)
      : (spec.activation ?? ACTIVATION)
  if (threshold === null) return null
  const startX = e.clientX
  const startY = e.clientY
  const point = { x: startX, y: startY }
  let stop: (() => void) | null = null
  let echo: { el: Element; left: number; top: number } | null = null

  const fire = (target: EventTarget | null): void => {
    try {
      spec.onWindowScroll?.(target)
    } catch (err) {
      console.error(err)
      g.handlers.cancel()
    }
  }

  const g: LiveGesture = {
    spec,
    active: false,
    scroll: (on) => {
      const cfg = spec.autoScroll
      if (!on) {
        stop?.()
        stop = null
        return
      }
      if (!cfg || !g.active || stop) return
      const scroller = resolveScroller(cfg.from, cfg.axis)
      if (!scroller) return
      stop = startAutoScroll({
        getPoint: () => point,
        scroller,
        axis: cfg.axis,
        onScrolled: () => {
          echo = { el: scroller, left: scroller.scrollLeft, top: scroller.scrollTop }
          fire(scroller)
        },
      })
    },
    handlers: {
      move: (ev) => {
        if (ev.pointerId !== e.pointerId) return
        if (ev.buttons === 0) {
          g.handlers.cancel()
          return
        }
        point.x = ev.clientX
        point.y = ev.clientY
        if (!g.active) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < threshold) return
          if (spec.capture !== false) {
            try {
              spec.el.setPointerCapture(e.pointerId)
            } catch {}
          }
          g.active = true
          let ok: boolean | undefined
          try {
            ok = spec.onActivate?.(ev)
          } catch (err) {
            console.error(err)
            ok = false
          }
          if (ok === false) {
            g.handlers.cancel()
            return
          }
          if (spec.cursor) spec.el.setAttribute(GRABBING, '')
          g.scroll(true)
        }
        try {
          spec.onDragMove(ev)
        } catch (err) {
          console.error(err)
          g.handlers.cancel()
        }
      },
      up: (ev) => {
        if (ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) {
          suppressNextClick()
          spec.onDrop()
        } else spec.onTap?.()
      },
      cancel: (ev) => {
        if (ev && ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) suppressReleaseClick()
        spec.onAbort?.()
      },
      key: (ev) => {
        if (ev.key !== 'Escape') return
        if (g.active) {
          ev.stopImmediatePropagation()
          ev.preventDefault()
        }
        g.handlers.cancel()
      },
      blur: () => g.handlers.cancel(),
      scroll: (ev) => {
        if (!g.active || !spec.onWindowScroll) return
        const t = ev.target
        if (
          echo &&
          t === echo.el &&
          echo.el.scrollLeft === echo.left &&
          echo.el.scrollTop === echo.top
        ) {
          echo = null
          return
        }
        if (spec.scrollTarget && !scrollMoved(ev.target, spec.scrollTarget())) return
        fire(t)
      },
    },
  }
  live = g
  window.addEventListener('pointermove', g.handlers.move)
  window.addEventListener('pointerup', g.handlers.up)
  window.addEventListener('pointercancel', g.handlers.cancel)
  window.addEventListener('blur', g.handlers.blur)
  window.addEventListener('scroll', g.handlers.scroll, { capture: true, passive: true })
  window.addEventListener('keydown', g.handlers.key, { capture: true })
  return {
    abort: () => {
      if (live === g) g.handlers.cancel()
    },
    autoScroll: (on) => {
      if (live === g) g.scroll(on)
    },
  }
}

export function usePointerGesture(): (spec: PointerGestureSpec) => GestureHandle | null {
  const handle = useRef<GestureHandle | null>(null)
  useEffect(() => () => handle.current?.abort(), [])
  return useCallback((spec) => {
    const h = beginPointerGesture(spec)
    if (h) handle.current = h
    return h
  }, [])
}
