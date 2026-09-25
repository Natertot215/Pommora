import { useEffect, useRef, useState } from 'react'

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
    pressing: false,
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
      const open = s.on ? s.inside || s.held || s.hold !== null : s.dwell && s.inside && !s.pressing
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
    const drop = (): void => {
      cancel()
      setOn(false)
    }
    const reset = (): void => {
      release()
      live.current.inside = false
      drop()
    }
    const hover = (inside: boolean): void => {
      const s = live.current
      s.inside = inside
      if (inside || s.hold !== 'leave') {
        settle()
        return
      }
      release()
      drop()
    }
    const press = (): void => {
      live.current.marked = Date.now()
    }
    const pressing = (down: boolean): void => {
      live.current.pressing = down
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
            if (!s.inside && !s.held) drop()
          },
          Math.max(0, side - since),
        )
      if (s.dwell || side !== undefined) setOn(true)
    }
    return { settle, reset, hover, press, pressing, flip }
  })

  // A release waits for the pointer's next move, whose boundary events report where it is — a native menu withholds them while open.
  useEffect(() => {
    if (held) return api.settle()
    window.addEventListener('pointermove', api.settle, { once: true })
    return () => window.removeEventListener('pointermove', api.settle)
  }, [held])
  useEffect(() => api.reset, [active])
  useEffect(() => {
    const s = live.current
    if (s.engaged === engaged) return
    s.engaged = engaged
    if (s.marked) api.flip(linger?.[engaged ? 'on' : 'off'])
    else api.reset()
  }, [engaged])
  useEffect(() => {
    // Only a primary press holds; a context menu swallows its own release, so its opening ends the press.
    const down = (e: PointerEvent): void => {
      if (e.button === 0) api.pressing(true)
    }
    const up = (): void => api.pressing(false)
    const ends = ['pointerup', 'pointercancel', 'contextmenu'] as const
    window.addEventListener('pointerdown', down, { capture: true })
    for (const t of ends) window.addEventListener(t, up, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', down, { capture: true })
      for (const t of ends) window.removeEventListener(t, up, { capture: true })
    }
  }, [api])

  return { on: dwell && coarse() ? active : active && on, hover: api.hover, press: api.press }
}
