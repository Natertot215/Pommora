import { useEffect, useRef, useState } from 'react'
import { GHOST_DWELL_MS } from './ghostCreate'

/** Handlers are identity-stable for the hook's lifetime. */
export interface HoverDwell {
  on: boolean
  hover: (inside: boolean) => void
  /** Turns on at once, as though the pointer had dwelt. */
  enter: () => void
}

// Opens on the ghost-create dwell and closes on the grace. `held` sustains an open dwell but never opens one, and a press holds off a pending open until release, so a gesture never has content pushed under it.
export function useHoverDwell(active: boolean, held: boolean, graceMs: number): HoverDwell {
  const [on, setOn] = useState(false)
  const live = useRef({ on, held, graceMs, inside: false, pressed: false })
  Object.assign(live.current, { on, held, graceMs })

  const [api] = useState(() => {
    let pending: { id: number; open: boolean } | null = null
    const cancel = (): void => {
      if (pending) window.clearTimeout(pending.id)
      pending = null
    }
    const settle = (): void => {
      const s = live.current
      const open = s.on ? s.inside || s.held : s.inside && !s.pressed
      if (pending?.open === open) return
      cancel()
      if (open === s.on) return
      const id = window.setTimeout(
        () => {
          pending = null
          setOn(open)
        },
        open ? GHOST_DWELL_MS : s.graceMs,
      )
      pending = { id, open }
    }
    const reset = (): void => {
      cancel()
      live.current.inside = false
      setOn(false)
    }
    const hover = (inside: boolean): void => {
      live.current.inside = inside
      settle()
    }
    const enter = (): void => {
      live.current.inside = true
      cancel()
      setOn(true)
    }
    const press = (pressed: boolean): void => {
      live.current.pressed = pressed
      settle()
    }
    return { settle, reset, hover, enter, press }
  })

  useEffect(api.settle, [held])
  useEffect(() => api.reset, [active])
  useEffect(() => {
    const down = (): void => api.press(true)
    const up = (): void => api.press(false)
    window.addEventListener('pointerdown', down, { capture: true })
    window.addEventListener('pointerup', up, { capture: true })
    window.addEventListener('pointercancel', up, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', down, { capture: true })
      window.removeEventListener('pointerup', up, { capture: true })
      window.removeEventListener('pointercancel', up, { capture: true })
    }
  }, [api])

  return { on: active && on, hover: api.hover, enter: api.enter }
}
