// The one pointer-gesture lifecycle: a pending→active state machine gated on ACTIVATION travel,
// the window listener trio + Esc, deferred pointer capture, and mirrored teardown. This module
// owns exactly that skeleton — geometry models, snapshots, autoscroll, and drop chrome stay with
// the caller, wired through the hooks below.

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react'
import { ACTIVATION, suppressNextClick } from './shared'

export type PointerGestureSpec = {
  el: HTMLElement
  event: ReactPointerEvent
  /** Travel (px) before the press becomes a drag. */
  activation?: number
  /** Off for window-listener-only surfaces — otherwise capture defers to activation. */
  capture?: boolean
  /** Crossing the activation threshold: snapshot geometry, bind per-drag listeners, start
   *  autoscroll. Return false to abort (e.g. the subject vanished) — teardown runs, no drop. */
  onActivate: (e: PointerEvent) => boolean | undefined
  onDragMove: (e: PointerEvent) => void
  /** Release after activation — commit here. The skeleton has already swallowed the click. */
  onDrop: () => void
  /** The gesture ended without a drop: pointercancel, Escape, blur, a lost release, an
   *  activation abort, or a throwing callback. */
  onAbort?: () => void
  /** Runs on EVERY end — drop, abort, or sub-threshold tap — before onDrop/onAbort. The place to
   *  stop autoscroll, remove per-drag listeners, and end drag-disclose. */
  teardown?: () => void
  /** Bound capture-phase on window for the ACTIVE gesture only — the invalidation hook for
   *  scroll-sensitive geometry, removed with the rest of the listener set. */
  onWindowScroll?: (e: Event) => void
  /** Bind Escape in the capture phase and swallow it while ACTIVE — for surfaces living inside a
   *  dismissable host (a dropdown) whose own Escape must not fire mid-drag. A sub-threshold press
   *  still leaves Escape to the host. */
  swallowActiveEscape?: boolean
}

/** Whether a capture-phase window scroll actually shifted `el` — only an ancestor scroller moves
 *  it. An unrelated inner scroller (a row's own hover marquee) must never cost a re-measure. */
export function scrollMoved(ev: Event, el: Element | null | undefined): boolean {
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

// One pointer, one gesture — a module singleton, so a begin during a live gesture is refused.
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
  } catch {
    // never captured / already released
  }
  // The lock clears even when a teardown throws — a stranded `live` refuses every future drag.
  try {
    g.spec.teardown?.()
  } catch (err) {
    console.error(err)
  } finally {
    live = null
  }
}

/** A live gesture's owner handle — `abort()` tears it down ONLY if it is still the live one
 *  (a component unmounting mid-drag must never kill a sibling's gesture). */
export type GestureHandle = { abort: () => void }

/** Window listeners drive the whole gesture — capture (if enabled) is deferred to activation so
 *  a sub-threshold tap keeps its click. A callback that throws aborts its own gesture rather
 *  than wedging the singleton. */
export function beginPointerGesture(spec: PointerGestureSpec): GestureHandle | null {
  const e = spec.event
  if (live || e.button !== 0 || !e.isPrimary) return null
  const startX = e.clientX
  const startY = e.clientY
  const threshold = spec.activation ?? ACTIVATION

  const abortLive = (): void => {
    detach(g)
    spec.onAbort?.()
  }

  const g: LiveGesture = {
    spec,
    active: false,
    handlers: {
      move: (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return
        // Zero buttons on a move means the release never reached us (focus steal, missed up) —
        // abort rather than drag a phantom press forever.
        if (ev.buttons === 0) {
          g.handlers.cancel()
          return
        }
        if (!g.active) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < threshold) return
          if (spec.capture !== false) {
            try {
              spec.el.setPointerCapture(e.pointerId)
            } catch {
              // capture unavailable — window listeners still drive the drag
            }
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
            abortLive()
            return
          }
        }
        try {
          spec.onDragMove(ev)
        } catch (err) {
          console.error(err)
          abortLive()
        }
      },
      up: (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) {
          suppressNextClick()
          spec.onDrop()
        }
      },
      cancel: (ev?: PointerEvent) => {
        if (ev && ev.pointerId !== e.pointerId) return
        const wasActive = g.active
        detach(g)
        if (wasActive) spec.onAbort?.()
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
        try {
          spec.onWindowScroll(ev)
        } catch (err) {
          console.error(err)
          abortLive()
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
  return {
    abort: () => {
      if (live === g) g.handlers.cancel()
    },
  }
}

/** Honors the refusal rule: a refused begin (already live) must never overwrite this hook's
 *  handle, or the unmount abort would leak the ACTIVE gesture's listeners instead. Returns
 *  whether the gesture actually started. */
export function usePointerGesture(): (spec: PointerGestureSpec) => boolean {
  const handle = useRef<GestureHandle | null>(null)
  useEffect(() => () => handle.current?.abort(), [])
  return useCallback((spec) => {
    const h = beginPointerGesture(spec)
    if (h) handle.current = h
    return h !== null
  }, [])
}
