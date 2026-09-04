// The hover-ghost mechanism, one home for every view: dwell arms it, grace paces the close on a
// leave, entering the ghost reverses an exit in flight, and suppression stands it down while a
// menu or editor owns the pointer. The effect belongs to each consumer; the hook holds one anchor.

import { createContext, useEffect, useRef, useState } from 'react'

// The dwell before a ghost extends — ONE value across every view's ghost; grace is per-view
// (a flush table ghost tolerates zero, a card ghost across the grid gap can't).
export const GHOST_DWELL_MS = 1500 // KNOB

// How long a standing ghost survives the pointer resting on another anchor inside its travel
// zone — the cards crossed en route to a ghost that wrapped onto the next grid row.
export const GHOST_TRAVEL_HOLD_MS = 1500 // KNOB

// The exit watchdog: a closing ghost whose consumer never delivers `closed()` — its exit motion
// unmounted behind a render gate, or it closed while a mask held it out of the DOM — clears
// itself after this beat. A stranded `closing` would reopen with no dwell on the next hover.
const GHOST_EXIT_BEAT_MS = 1000

/** The suppress handle, published by a view whose surfaces pop native menus from inside
 *  memoized children (Cards) — caller-side wrapping can't reach those pops. Defaults to a
 *  pass-through, so a surface with no ghost host above it pops its menu unwrapped. */
export const GhostSuppress = createContext<GhostAnchor['suppressWrap']>((menu) => menu())

export interface GhostAnchorOptions {
  dwellMs: number
  graceMs: number
  /** Re-read at the dwell timer's fire time — a suppressor arriving mid-dwell (a cell editor,
   *  a naming session) must not leave a ghost armed to snap in the instant it closes. */
  suppressed: () => boolean
  /** Entering an anchor its zone admits reads as travel TOWARD the ghost: it holds for holdMs,
   *  then the rested-on anchor's own dwell arms. Cards pass the ghost's own grid row. */
  travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
}

/** Every handler is identity-stable for the hook's lifetime — consumers hand them to contexts
 *  and memoized rows directly; only `ghost` changes across renders. */
export interface GhostAnchor {
  ghost: { anchorId: string; closing: boolean } | null
  onHover: (id: string, entering: boolean) => void
  onGhostEnter: () => void
  onGhostLeave: () => void
  /** Claims the anchor for a create and unmounts the ghost in the same act — the real row
   *  takes its seat, so a fast double-click can't create twice. */
  take: () => string | null
  /** The exit finished — the consumer's motion (a Reveal collapse, a FLIP release) drives this;
   *  the watchdog beat is the fallback when the motion never gets to report. */
  closed: () => void
  /** Synchronous full clear, no exit motion — the anchor left the pipeline, the view changed
   *  mode, or a pointer went down (a drag must never measure a grid the ghost still occupies). */
  clear: (anchorId?: string) => void
  /** Wraps a menu pop that resolves on dismissal: the ghost stands down and stays unarmed
   *  while any wrapped menu owns the pointer (pops can overlap). */
  suppressWrap: <T>(menu: () => Promise<T>) => Promise<T>
}

export function useGhostAnchor(opts: GhostAnchorOptions): GhostAnchor {
  const [ghost, setGhost] = useState<{ anchorId: string; closing: boolean } | null>(null)
  const ghostRef = useRef(ghost)
  ghostRef.current = ghost
  const optsRef = useRef(opts)
  optsRef.current = opts

  // Handlers build once and read live state through the refs above — stable identities are
  // the hook's contract, so no consumer re-stabilizes them with its own ref + memo scaffold.
  const [handlers] = useState(() => {
    const timers: { dwell: number | null; grace: number | null; exit: number | null } = {
      dwell: null,
      grace: null,
      exit: null,
    }
    let menusOpen = 0
    // Nothing arms while a suppressor or a wrapped menu owns the pointer.
    const blocked = (): boolean => optsRef.current.suppressed() || menusOpen > 0
    const clearTimer = (key: keyof typeof timers): void => {
      const t = timers[key]
      if (t !== null) window.clearTimeout(t)
      timers[key] = null
    }
    const closeGhost = (): void => {
      setGhost((g) => (g ? { ...g, closing: true } : g))
      clearTimer('exit')
      timers.exit = window.setTimeout(
        () => setGhost((g) => (g?.closing ? null : g)),
        GHOST_EXIT_BEAT_MS,
      )
    }
    const armDwell = (id: string): void => {
      timers.dwell = window.setTimeout(() => {
        if (!blocked()) setGhost((g) => (g?.anchorId === id ? g : { anchorId: id, closing: false }))
      }, optsRef.current.dwellMs)
    }
    const clear = (anchorId?: string): void => {
      clearTimer('dwell')
      clearTimer('grace')
      const g = ghostRef.current
      if (anchorId === undefined || g?.anchorId === anchorId) {
        clearTimer('exit')
        setGhost(null)
      }
    }
    const onHover = (id: string, entering: boolean): void => {
      clearTimer('dwell')
      clearTimer('grace')
      if (!entering) {
        timers.grace = window.setTimeout(closeGhost, optsRef.current.graceMs)
        return
      }
      if (blocked()) return
      const hold = optsRef.current.travelHold
      const g = ghostRef.current
      if (hold && g && g.anchorId !== id && hold.inZone(id)) {
        // Travel territory: the ghost holds (an exit in flight reverses), and the hold expires
        // into the normal law — the ghost closes and this anchor's own dwell arms.
        clearTimer('exit')
        setGhost((cur) => (cur?.closing ? { ...cur, closing: false } : cur))
        timers.grace = window.setTimeout(() => {
          closeGhost()
          armDwell(id)
        }, hold.holdMs)
        return
      }
      if (g?.anchorId === id && g.closing) clearTimer('exit')
      setGhost((cur) => {
        // Returning to the anchor mid-exit reverses the collapse instead of re-dwelling.
        if (cur?.anchorId === id) return cur.closing ? { anchorId: id, closing: false } : cur
        // The grace serves the travel INTO the ghost — a ghost anchored elsewhere closes now.
        if (cur) return { ...cur, closing: true }
        return cur
      })
      armDwell(id)
    }
    // Entering the ghost cancels a pending close and reverses an exit already in flight;
    // leaving gets the same grace the anchor's leave gets.
    const onGhostEnter = (): void => {
      clearTimer('grace')
      clearTimer('exit')
      setGhost((g) => (g?.closing ? { ...g, closing: false } : g))
    }
    const onGhostLeave = (): void => {
      clearTimer('grace')
      timers.grace = window.setTimeout(closeGhost, optsRef.current.graceMs)
    }
    const take = (): string | null => {
      // Every timer dies with the take — a dwell armed on a row crossed en route to the ghost
      // must not fire after the create and pop a ghost nobody is hovering.
      clearTimer('dwell')
      clearTimer('grace')
      clearTimer('exit')
      const id = ghostRef.current?.anchorId ?? null
      setGhost(null)
      return id
    }
    const closed = (): void => {
      clearTimer('exit')
      setGhost((g) => (g?.closing ? null : g))
    }
    const suppressWrap = async <T>(menu: () => Promise<T>): Promise<T> => {
      clearTimer('dwell')
      clearTimer('grace')
      closeGhost()
      menusOpen++
      try {
        return await menu()
      } finally {
        menusOpen--
      }
    }
    return { onHover, onGhostEnter, onGhostLeave, take, closed, clear, suppressWrap }
  })

  useEffect(() => () => handlers.clear(), [handlers])
  // Any pointerdown outside the ghost stands it down synchronously — before a drag can cross
  // its activation threshold and freeze item rects over a grid the ghost still occupies. The
  // ghost's own pointerdown survives (its click is the create). Bound unconditionally: a press
  // must also kill a PENDING dwell, or the ghost mounts mid-drag and shifts the frozen rows.
  useEffect(() => {
    const down = (e: PointerEvent): void => {
      const el = e.target instanceof Element ? e.target : null
      if (!el?.closest('[data-ghost-root]')) handlers.clear()
    }
    window.addEventListener('pointerdown', down, { capture: true })
    return () => window.removeEventListener('pointerdown', down, { capture: true })
  }, [handlers])

  return { ghost, ...handlers }
}

/** The anchor left the consumer's pipeline (a reload, a filter, a regroup, a tree change) —
 *  clears ghost STATE, not just its render: a stranded `closing` would reopen with no dwell on
 *  the next hover. Unconditional by design; the clear is a no-op once the anchor is gone. */
export function useClearStrandedGhost(
  api: GhostAnchor,
  anchors: { has: (anchorId: string) => boolean },
): void {
  const stranded =
    api.ghost !== null && !anchors.has(api.ghost.anchorId) ? api.ghost.anchorId : null
  useEffect(() => {
    if (stranded !== null) api.clear(stranded)
  })
}
