import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react'
import { ACTIVATION, suppressNextClick, suppressReleaseClick } from './shared'
import { beginDragDisclose, endDragDisclose } from './dragDisclose'

export type PointerGestureSpec = {
  el: HTMLElement
  /** A CodeMirror extension has no synthetic event to hand over, and only the shared fields are read. */
  event: ReactPointerEvent | PointerEvent
  activation?: number
  capture?: boolean
  onActivate: (e: PointerEvent) => boolean | undefined
  onDragMove: (e: PointerEvent) => void
  onDrop: () => void
  /** Release before activation. A cancel is not a tap: pointercancel, Escape, blur and a lost release all route to `onAbort`. */
  onTap?: () => void
  onAbort?: () => void
  teardown?: () => void
  onWindowScroll?: (e: Event) => void
  scrollTarget?: () => Element | null
  onDisclose?: () => void
  /** For a surface inside a dismissable host whose own Escape must not fire mid-drag. */
  swallowActiveEscape?: boolean
}

/** Only an ancestor scroller shifts `el`; an unrelated inner scroller must not cost a re-measure. */
function scrollMoved(ev: Event, el: Element | null | undefined): boolean {
  return !(ev.target instanceof Element) || !el || ev.target.contains(el)
}

type LiveGesture = {
  spec: PointerGestureSpec
  active: boolean
  handlers: {
    move: (e: PointerEvent) => void
    up: (e: PointerEvent) => void
    cancel: (e?: PointerEvent) => void
    key: (e: KeyboardEvent) => void
    blur: () => void
    scroll: (e: Event) => void
  }
}

// One pointer, one gesture: a begin during a live one is refused.
let live: LiveGesture | null = null

function detach(g: LiveGesture): void {
  window.removeEventListener('pointermove', g.handlers.move)
  window.removeEventListener('pointerup', g.handlers.up)
  window.removeEventListener('pointercancel', g.handlers.cancel)
  window.removeEventListener('blur', g.handlers.blur)
  window.removeEventListener('scroll', g.handlers.scroll, { capture: true })
  window.removeEventListener('keydown', g.handlers.key, {
    capture: g.spec.swallowActiveEscape ?? false,
  })
  try {
    g.spec.el.releasePointerCapture(g.spec.event.pointerId)
  } catch {}
  if (g.spec.onDisclose) endDragDisclose()
  // The lock clears even when a teardown throws: a stranded `live` refuses every future drag.
  try {
    g.spec.teardown?.()
  } catch (err) {
    console.error(err)
  } finally {
    live = null
  }
}

/** `abort()` tears the gesture down only if it is still the live one, so a component unmounting mid-drag can't kill a sibling's. */
export type GestureHandle = { abort: () => void }

/** Pointer capture is deferred to activation so a sub-threshold tap keeps its click. A callback that throws aborts its own gesture rather than wedging the singleton. */
export function beginPointerGesture(spec: PointerGestureSpec): GestureHandle | null {
  const e = spec.event
  if (live || e.button !== 0 || !e.isPrimary) return null
  const startX = e.clientX
  const startY = e.clientY
  const threshold = spec.activation ?? ACTIVATION

  const g: LiveGesture = {
    spec,
    active: false,
    handlers: {
      move: (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return
        // Zero buttons means the release never reached us — abort rather than drag a phantom press.
        if (ev.buttons === 0) {
          g.handlers.cancel()
          return
        }
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
            ok = spec.onActivate(ev)
          } catch (err) {
            console.error(err)
            ok = false
          }
          if (ok === false) {
            g.handlers.cancel()
            return
          }
        }
        try {
          spec.onDragMove(ev)
        } catch (err) {
          console.error(err)
          g.handlers.cancel()
        }
      },
      up: (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) {
          suppressNextClick()
          spec.onDrop()
        } else spec.onTap?.()
      },
      cancel: (ev?: PointerEvent) => {
        if (ev && ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) suppressReleaseClick()
        spec.onAbort?.()
      },
      key: (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape') return
        if (spec.swallowActiveEscape && g.active) {
          ev.stopImmediatePropagation()
          ev.preventDefault()
        }
        g.handlers.cancel()
      },
      blur: () => g.handlers.cancel(),
      scroll: (ev: Event) => {
        if (!g.active || !spec.onWindowScroll) return
        if (spec.scrollTarget && !scrollMoved(ev, spec.scrollTarget())) return
        try {
          spec.onWindowScroll(ev)
        } catch (err) {
          console.error(err)
          g.handlers.cancel()
        }
      },
    },
  }
  live = g
  window.addEventListener('pointermove', g.handlers.move)
  window.addEventListener('pointerup', g.handlers.up)
  window.addEventListener('pointercancel', g.handlers.cancel)
  window.addEventListener('blur', g.handlers.blur)
  window.addEventListener('scroll', g.handlers.scroll, { capture: true, passive: true })
  window.addEventListener('keydown', g.handlers.key, {
    capture: spec.swallowActiveEscape ?? false,
  })
  if (spec.onDisclose) beginDragDisclose(spec.onDisclose)
  return {
    abort: () => {
      if (live === g) g.handlers.cancel()
    },
  }
}

/** A refused begin must never overwrite the stored handle, or the unmount abort would leak the live gesture's listeners instead. */
export function usePointerGesture(): (spec: PointerGestureSpec) => boolean {
  const handle = useRef<GestureHandle | null>(null)
  useEffect(() => () => handle.current?.abort(), [])
  return useCallback((spec) => {
    const h = beginPointerGesture(spec)
    if (h) handle.current = h
    return h !== null
  }, [])
}
