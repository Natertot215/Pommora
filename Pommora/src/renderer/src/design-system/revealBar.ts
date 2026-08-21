/** The reveal band's hit-zone, measured from the surface's own bottom corner — one per end of the
 *  bar, mirrored. A host tracks the pointer against these rather than mounting invisible buttons,
 *  so a generous reveal area never swallows clicks to the content beneath it. */
export const REVEAL_NEAR_W = 260
export const REVEAL_NEAR_H = 120

/** Where a lead control's label actually begins on screen. A zone measured from the surface's raw
 *  left edge can sit under an overlaying pane — the detail pane runs beneath the sidebar — leaving
 *  the pointer no way to reach it. The control's own content box is where it visibly starts, so a
 *  zone hung off that stays the size it reads as, and follows the inset when the sidebar hides. */
export function leadOrigin(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback
  return el.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(el).paddingLeft)
}
