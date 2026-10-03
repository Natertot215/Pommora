import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type TransitionEvent as ReactTransitionEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

export const REVEAL_DWELL_MS = 1500 // KNOB
export const REVEAL_GRACE_MS = 150 // KNOB

/** How long a reveal holds after its toggle flips: a duration from the press, or until the pointer leaves the host. */
export type Linger = number | 'leave'

const coarse = (): boolean => window.matchMedia?.('(hover: none)').matches === true

/** Handlers are identity-stable for the hook's lifetime. */
interface HoverReveal {
  on: boolean
  hover: (inside: boolean) => void
  /** Called by a toggle's own press, before it flips `engaged`. */
  press: () => void
}

// A dwell opens on REVEAL_DWELL_MS and closes on the grace. `held` sustains an open reveal but never opens one, and a press holds off a pending open until release, so a gesture never has content pushed under it. A toggle's press flip starts the linger its new side names.
export function useHoverReveal({
  active = true,
  dwell = false,
  held = false,
  engaged = false,
  linger,
}: {
  active?: boolean
  dwell?: boolean
  held?: boolean
  engaged?: boolean
  linger?: { on?: Linger; off?: Linger }
}): HoverReveal {
  const [on, setOn] = useState(false)
  const live = useRef({
    on,
    held,
    dwell,
    engaged,
    inside: false,
    holding: false,
    marked: 0,
    hold: null as number | 'leave' | null,
  })
  Object.assign(live.current, { on, held, dwell })

  const [api] = useState(() => {
    let pending: { id: number; open: boolean } | null = null
    const cancel = (): void => {
      if (pending) window.clearTimeout(pending.id)
      pending = null
    }
    const release = (): void => {
      const s = live.current
      if (typeof s.hold === 'number') window.clearTimeout(s.hold)
      s.hold = null
    }
    const settle = (): void => {
      const s = live.current
      const open = s.on ? s.inside || s.held || s.hold !== null : s.dwell && s.inside && !s.holding
      if (pending?.open === open) return
      cancel()
      if (open === s.on) return
      const id = window.setTimeout(
        () => {
          pending = null
          setOn(open)
        },
        open ? REVEAL_DWELL_MS : REVEAL_GRACE_MS,
      )
      pending = { id, open }
    }
    const reset = (): void => {
      release()
      live.current.inside = false
      cancel()
      setOn(false)
    }
    const hover = (inside: boolean): void => {
      const s = live.current
      if (!inside) s.marked = 0
      if (!inside && s.hold === 'leave') reset()
      else {
        s.inside = inside
        settle()
      }
    }
    const press = (): void => {
      live.current.marked = Date.now()
    }
    const holdOff = (down: boolean): void => {
      live.current.holding = down
      settle()
    }
    // The press hands the pointer to the flipped side: it counts as inside, and that side's linger runs from the press.
    const flip = (side: Linger | undefined): void => {
      const s = live.current
      const since = Date.now() - s.marked
      s.marked = 0
      s.inside = true
      cancel()
      release()
      if (side === 'leave') s.hold = side
      else if (side !== undefined)
        s.hold = window.setTimeout(
          () => {
            s.hold = null
            if (!s.inside && !s.held) reset()
          },
          Math.max(0, side - since),
        )
      setOn(s.dwell || side !== undefined)
    }
    return { settle, reset, hover, press, holdOff, flip }
  })

  // A release waits for the pointer's next move, whose boundary events report where it is — a native menu withholds them while open.
  useEffect(() => {
    if (!dwell) return
    if (held) return api.settle()
    window.addEventListener('pointermove', api.settle, { once: true })
    return () => window.removeEventListener('pointermove', api.settle)
  }, [held, dwell])
  useEffect(() => api.reset, [active])
  useEffect(() => {
    const s = live.current
    if (s.engaged === engaged) return
    s.engaged = engaged
    if (s.marked) api.flip(linger?.[engaged ? 'on' : 'off'])
    else api.reset()
  }, [engaged])
  useEffect(() => {
    if (!dwell) return
    // Only a primary press holds; a context menu swallows its own release, so its opening ends the press.
    const down = (e: PointerEvent): void => {
      if (e.button === 0) api.holdOff(true)
    }
    const up = (): void => api.holdOff(false)
    const ends = ['pointerup', 'pointercancel', 'contextmenu'] as const
    window.addEventListener('pointerdown', down, { capture: true })
    for (const t of ends) window.addEventListener(t, up, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', down, { capture: true })
      for (const t of ends) window.removeEventListener(t, up, { capture: true })
    }
  }, [api, dwell])

  return { on: dwell && coarse() ? active : active && on, hover: api.hover, press: api.press }
}

/** How near the pointer must come: inline controls in content, edge-docked toggles, corner handles. */
export const REVEAL_REACH = { inline: 260, edge: 280, corner: 300 } as const // KNOB

export type Reach = {
  size: keyof typeof REVEAL_REACH
  /** The directions the reach extends from its anchor; an edge reach is a band half as deep as it's wide, the others round their far corner. Without it, the reach surrounds the anchor. */
  toward?: { x: -1 | 1; y: -1 | 1 }
}

export type Box = { left: number; top: number; right: number; bottom: number }

/** `scale` resizes the reach with its surface, as the editor's font and zoom do. */
export function withinReach(anchor: Box, reach: Reach, x: number, y: number, scale = 1): boolean {
  const r = REVEAL_REACH[reach.size] * scale
  const { toward } = reach
  if (toward && (toward.x < 0 ? x > anchor.right : x < anchor.left)) return false
  if (toward && (toward.y < 0 ? y > anchor.bottom : y < anchor.top)) return false
  const dx = Math.max(0, anchor.left - x, x - anchor.right)
  const dy = Math.max(0, anchor.top - y, y - anchor.bottom)
  return reach.size === 'edge' ? dx <= r && dy <= r / 2 : Math.hypot(dx, dy) <= r
}

/** Makes `ref`'s element a reveal host that turns on while the pointer is within `reach` of it, tracked window-wide. The rect is cached and dropped whenever the element may have moved: when a transition ends on it, an ancestor, or a sibling of either, on a resize, or while a button is held. */
export function useRevealWithin(ref: RefObject<HTMLElement | null>, reach: Reach): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let box: Box | null = null
    const show = (on: boolean): void => {
      const v = on ? 'on' : 'off'
      if (el.dataset.revealHost !== v) el.dataset.revealHost = v
    }
    const forget = (): void => {
      box = null
    }
    const onMove = (e: PointerEvent): void => {
      if (e.buttons !== 0) {
        forget()
        show(false)
        return
      }
      box ??= el.getBoundingClientRect()
      show(withinReach(box, reach, e.clientX, e.clientY))
    }
    const onOut = (e: PointerEvent): void => {
      if (!e.relatedTarget) show(false)
    }
    const onTransitionEnd = (e: TransitionEvent): void => {
      if ((e.target as Element).parentElement?.contains(el)) forget()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onOut, { passive: true })
    window.addEventListener('transitionend', onTransitionEnd, { capture: true, passive: true })
    window.addEventListener('resize', forget, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onOut)
      window.removeEventListener('transitionend', onTransitionEnd, { capture: true })
      window.removeEventListener('resize', forget)
    }
  }, [ref, reach])
}

const TRAIL: Reach = { size: 'edge', toward: { x: -1, y: -1 } }
const LEAD: Reach = { size: 'edge', toward: { x: 1, y: -1 } }

/** Tracked against the pointer, not invisible buttons, so the reveal area never swallows clicks beneath it. Each toggle's reach runs down to the host's bottom edge, so the bar beneath a lifted toggle still reveals it. The rects are cached because a rect per move forces a layout, and dropped whenever the toggles may have moved: after the host renders, when the host's or a toggle's own transition ends, while a held button may be moving the surface, and on `remeasure`. */
export function useRevealNear(): {
  near: boolean
  nearLead: boolean
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onTransitionEnd: (e: ReactTransitionEvent<HTMLElement>) => void
  remeasure: () => void
} {
  const [near, setNear] = useState(false)
  const [nearLead, setNearLead] = useState(false)
  const live = useRef({ anchors: null as { trail?: Box; lead?: Box } | null, near, nearLead })
  const remeasure = useCallback(() => {
    live.current.anchors = null
  }, [])
  useLayoutEffect(remeasure)
  const show = (trail: boolean, lead: boolean): void => {
    const s = live.current
    if (trail !== s.near) {
      s.near = trail
      setNear(trail)
    }
    if (lead !== s.nearLead) {
      s.nearLead = lead
      setNearLead(lead)
    }
  }
  return {
    near,
    nearLead,
    onPointerMove: (e) => {
      const s = live.current
      if (e.buttons !== 0) {
        s.anchors = null
        show(false, false)
        return
      }
      if (!s.anchors) {
        const bottom = e.currentTarget.getBoundingClientRect().bottom
        const box = (sel: string): Box | undefined => {
          const r = e.currentTarget.querySelector(sel)?.getBoundingClientRect()
          return r && { left: r.left, top: r.top, right: r.right, bottom }
        }
        s.anchors = { trail: box('[data-reveal-trail]'), lead: box('[data-reveal-lead]') }
      }
      const { trail, lead } = s.anchors
      show(
        !!trail && withinReach(trail, TRAIL, e.clientX, e.clientY),
        !!lead && withinReach(lead, LEAD, e.clientX, e.clientY),
      )
    },
    onPointerLeave: () => {
      live.current.anchors = null
      show(false, false)
    },
    onTransitionEnd: (e) => {
      const t = e.target as Element
      if (t === e.currentTarget || t.matches('[data-reveal-trail], [data-reveal-lead]')) remeasure()
    },
    remeasure,
  }
}
