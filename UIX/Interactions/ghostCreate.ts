import { createContext, useEffect, useRef, useState } from 'react'

// The dwell is one value across every view's ghost; grace stays per-view.
export const GHOST_DWELL_MS = 1500 // KNOB

// How long a standing ghost survives the pointer resting on another anchor in its travel zone.
export const GHOST_TRAVEL_HOLD_MS = 1500 // KNOB

// Watchdog for a closing ghost whose consumer never delivers `closed()`; a stranded `closing` would reopen with no dwell on the next hover.
const GHOST_EXIT_BEAT_MS = 1000

/** Published by a view whose surfaces pop native menus from inside memoized children, which caller-side wrapping can't reach. */
export const GhostSuppress = createContext<GhostAnchor['suppressWrap']>((menu) => menu())

interface GhostAnchorOptions {
  dwellMs: number
  graceMs: number
  /** Re-read when the dwell timer fires: a suppressor arriving mid-dwell must not leave a ghost armed to snap in the instant it closes. */
  suppressed: () => boolean
  travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
}

/** Every handler is identity-stable for the hook's lifetime, so consumers hand them to contexts and memoized rows directly; only `ghost` changes across renders. */
export interface GhostAnchor {
  ghost: { anchorId: string; closing: boolean } | null
  onHover: (id: string, entering: boolean) => void
  onGhostEnter: () => void
  onGhostLeave: () => void
  /** Claims the anchor and unmounts the ghost in one act, so a fast double-click can't create twice. */
  take: () => string | null
  closed: () => void
  /** Synchronous full clear, no exit motion — a drag must never measure a grid the ghost occupies. */
  clear: (anchorId?: string) => void
  suppressWrap: <T>(menu: () => Promise<T>) => Promise<T>
}

export function useGhostAnchor(opts: GhostAnchorOptions): GhostAnchor {
  const [ghost, setGhost] = useState<{ anchorId: string; closing: boolean } | null>(null)
  const ghostRef = useRef(ghost)
  ghostRef.current = ghost
  const optsRef = useRef(opts)
  optsRef.current = opts

  const [handlers] = useState(() => {
    const timers: { dwell: number | null; grace: number | null; exit: number | null } = {
      dwell: null,
      grace: null,
      exit: null,
    }
    let menusOpen = 0
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
        if (cur?.anchorId === id) return cur.closing ? { anchorId: id, closing: false } : cur
        if (cur) return { ...cur, closing: true }
        return cur
      })
      armDwell(id)
    }
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
      // A dwell armed on a row crossed en route must not fire after the create.
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
  // Stands the ghost down before a drag can freeze item rects over a grid it still occupies. Bound
  // unconditionally: a press must kill a pending dwell too, or the ghost mounts mid-drag.
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

/** Clears ghost state, not just its render, when the anchor leaves the consumer's pipeline: a
 *  stranded `closing` would reopen with no dwell on the next hover. */
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
