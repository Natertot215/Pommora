// The hover preview's one universal size — every pane opens at it, resizing any pane updates it for
// all, persisted per-machine in nexus.db. This accessor is the single door: it clamps on read (a
// stored value from before a bounds change must not reopen out of bounds) and writes through on
// set. The viewport ceiling stays with the pane at render, where the live link geometry lives.
import type { GlanceSize } from '@shared/types'

// KNOB — the default and floor sizes.
export const CARD_DEFAULT: GlanceSize = { w: 260, h: 120 }
export const CARD_MIN: GlanceSize = { w: 180, h: 100 }

const clamp = (s: GlanceSize): GlanceSize => ({
  w: Math.max(CARD_MIN.w, Math.round(s.w)),
  h: Math.max(CARD_MIN.h, Math.round(s.h)),
})

let cached: GlanceSize | null = null
let seeded = false

/** Idempotent async seed — the first pane open after launch may precede the row landing, and
 *  simply uses the default until it does. */
export function seedGlanceSize(): void {
  if (seeded) return
  seeded = true
  void window.nexus.glance.load().then((r) => {
    if (r.ok && r.value) cached = clamp(r.value)
  })
}

export function hoverPaneSize(): GlanceSize {
  return cached ?? CARD_DEFAULT
}

export function setGlanceSize(next: GlanceSize): void {
  cached = clamp(next)
  void window.nexus.glance.save(cached)
}
