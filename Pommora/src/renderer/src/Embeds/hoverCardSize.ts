// The hover card's one universal size — every card opens at it, resizing any card updates it for
// all, persisted per-machine in nexus.db. This accessor is the single door: it clamps on read
// (a stored value from before a bounds change must not reopen out of bounds — the sidebar-width
// precedent) and writes through on set. The viewport ceiling stays with the card at render, where
// the live link geometry lives.
import type { HoverCardSize } from '@shared/types'

// KNOB — the default and floor sizes.
export const CARD_DEFAULT: HoverCardSize = { w: 260, h: 120 }
export const CARD_MIN: HoverCardSize = { w: 180, h: 100 }

const clamp = (s: HoverCardSize): HoverCardSize => ({
  w: Math.max(CARD_MIN.w, Math.round(s.w)),
  h: Math.max(CARD_MIN.h, Math.round(s.h)),
})

let cached: HoverCardSize | null = null
let seeded = false

/** Idempotent async seed — the first card open after launch may precede the row landing, and
 *  simply uses the default until it does. */
export function seedHoverCardSize(): void {
  if (seeded) return
  seeded = true
  void window.nexus.hoverCard.load().then((r) => {
    if (r.ok && r.value) cached = clamp(r.value)
  })
}

export function hoverCardSize(): HoverCardSize {
  return cached ?? CARD_DEFAULT
}

export function setHoverCardSize(next: HoverCardSize): void {
  cached = clamp(next)
  void window.nexus.hoverCard.save(cached)
}
