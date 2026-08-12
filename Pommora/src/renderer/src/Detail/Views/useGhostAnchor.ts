// The hover-ghost mechanism, one home for every view: dwell arms a ghost on the hovered
// anchor, grace paces the close on a leave, entering the ghost keeps it (reversing an exit
// already in flight), and suppression stands it down while a menu or editor owns the pointer.
// The effect — what a ghost looks like and how it moves — belongs to each consumer; the hook
// holds one anchor per consumer, so cross-view overlap is transient by leave-close.

import { createContext, useEffect, useRef, useState } from 'react'

// The dwell before a ghost extends — ONE value across every view's ghost; grace is per-view
// (a flush table ghost tolerates zero, a card ghost across the grid gap can't).
export const GHOST_DWELL_MS = 1500 // KNOB

/** The suppress handle, published by a view whose surfaces pop native menus from inside
 *  memoized children (Cards) — caller-side wrapping can't reach those pops. */
export const GhostSuppress = createContext<GhostAnchor['suppressWrap'] | null>(null)

export interface GhostAnchorOptions {
  dwellMs: number
  graceMs: number
  /** Re-read at the dwell timer's fire time — a suppressor arriving mid-dwell (a cell editor,
   *  a naming session) must not leave a ghost armed to snap in the instant it closes. */
  suppressed: () => boolean
}

export interface GhostAnchor {
  ghost: { anchorId: string; closing: boolean } | null
  onHover: (id: string, entering: boolean) => void
  onGhostEnter: () => void
  onGhostLeave: () => void
  /** Claims the anchor for a create and unmounts the ghost in the same act — the real row
   *  takes its seat, so a fast double-click can't create twice. */
  take: () => string | null
  /** The exit finished — the consumer's motion (a Reveal collapse, a FLIP release) drives this;
   *  without it a closing ghost never unmounts. */
  closed: () => void
  /** Synchronous full clear, no exit motion — the anchor left the pipeline, the view changed
   *  mode, or a pointer went down (a drag must never measure a grid the ghost still occupies). */
  clear: (anchorId?: string) => void
  /** Wraps a menu pop that resolves on dismissal: the ghost stands down and stays unarmed
   *  while the menu owns the pointer. */
  suppressWrap: <T>(menu: () => Promise<T>) => Promise<T>
}

export function useGhostAnchor(opts: GhostAnchorOptions): GhostAnchor {
  const [ghost, setGhost] = useState<{ anchorId: string; closing: boolean } | null>(null)
  const timers = useRef<{ dwell: number | null; grace: number | null }>({
    dwell: null,
    grace: null,
  })
  const menuOpen = useRef(false)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const clearTimer = (key: 'dwell' | 'grace'): void => {
    const t = timers.current[key]
    if (t !== null) window.clearTimeout(t)
    timers.current[key] = null
  }
  const closeGhost = (): void => setGhost((g) => (g ? { ...g, closing: true } : g))
  const clear = (anchorId?: string): void => {
    clearTimer('dwell')
    clearTimer('grace')
    setGhost((g) => (anchorId === undefined || g?.anchorId === anchorId ? null : g))
  }

  useEffect(
    () => () => {
      for (const t of Object.values(timers.current)) if (t !== null) window.clearTimeout(t)
    },
    [],
  )
  // Any pointerdown outside the ghost stands it down synchronously — before a drag can cross
  // its activation threshold and freeze item rects over a grid the ghost still occupies. The
  // ghost's own pointerdown survives (its click is the create).
  const live = ghost !== null
  useEffect(() => {
    if (!live) return
    const down = (e: PointerEvent): void => {
      const el = e.target instanceof Element ? e.target : null
      if (!el?.closest('[data-ghost-root]')) clear()
    }
    window.addEventListener('pointerdown', down, { capture: true })
    return () => window.removeEventListener('pointerdown', down, { capture: true })
  }, [live])

  const onHover = (id: string, entering: boolean): void => {
    clearTimer('dwell')
    clearTimer('grace')
    if (!entering) {
      timers.current.grace = window.setTimeout(closeGhost, optsRef.current.graceMs)
      return
    }
    if (optsRef.current.suppressed() || menuOpen.current) return
    setGhost((g) => {
      // Returning to the anchor mid-exit reverses the collapse instead of re-dwelling.
      if (g?.anchorId === id) return g.closing ? { anchorId: id, closing: false } : g
      // The grace serves the travel INTO the ghost — a ghost anchored elsewhere closes now.
      if (g) return { ...g, closing: true }
      return g
    })
    timers.current.dwell = window.setTimeout(() => {
      // Re-checked at fire time — a suppressor opened mid-dwell must not leave a ghost armed
      // to snap in the instant it closes.
      if (!optsRef.current.suppressed() && !menuOpen.current)
        setGhost((g) => (g?.anchorId === id ? g : { anchorId: id, closing: false }))
    }, optsRef.current.dwellMs)
  }
  // Entering the ghost cancels a pending grace and reverses an exit already in flight; leaving
  // gets the same grace the anchor's leave gets.
  const onGhostEnter = (): void => {
    clearTimer('grace')
    setGhost((g) => (g?.closing ? { ...g, closing: false } : g))
  }
  const onGhostLeave = (): void => {
    clearTimer('grace')
    timers.current.grace = window.setTimeout(closeGhost, optsRef.current.graceMs)
  }
  const take = (): string | null => {
    const id = ghost?.anchorId ?? null
    setGhost(null)
    return id
  }
  const closed = (): void => setGhost((g) => (g?.closing ? null : g))
  const suppressWrap = async <T,>(menu: () => Promise<T>): Promise<T> => {
    clearTimer('dwell')
    clearTimer('grace')
    closeGhost()
    menuOpen.current = true
    try {
      return await menu()
    } finally {
      menuOpen.current = false
    }
  }

  return { ghost, onHover, onGhostEnter, onGhostLeave, take, closed, clear, suppressWrap }
}
