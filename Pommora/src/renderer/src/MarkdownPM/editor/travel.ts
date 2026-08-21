// Going somewhere in an editor, opening whatever conceals it. An editor capability rather than a
// page-surface one: it composes the editor's own reveal seam, the editor shell's header-zone
// variable, and the design system's glide, and every surface that mounts an editor can want it.
import type { EditorView } from '@codemirror/view'
import { SEEK_GLIDE, scrollGlide } from '@renderer/design-system/interactions/autoscroll'
import { FOLD_SETTLE_MS, expandFoldsAt } from './folding'

// Fallback inset, used only where the page header hasn't published its height yet.
const REVEAL_MARGIN = 12

/** Where a jumped-to line settles: the band the page header occupies, which the body already pads
 *  itself by and which is exactly where a page's own inline title reads. Landing there rather than at
 *  the viewport's edge stops an arriving line from being jammed against the top. */
function headerZone(view: EditorView): number {
  const shell = view.dom.closest('.mdpm-shell')
  if (!shell) return REVEAL_MARGIN
  const zone = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--header-zone'))
  return Number.isFinite(zone) ? zone : REVEAL_MARGIN
}

/** Travel `view` to `pos`, opening whatever was hiding it. The document and the caret are untouched
 *  — going somewhere never edits it or moves where the next keystroke lands — but a collapsed
 *  section IS opened, because arriving at a heading whose body is still folded is indistinguishable
 *  from having gone nowhere. */
export function travelTo(view: EditorView, pos: number): void {
  // A caller's offset can come from a body that trails the editor's own doc by a beat.
  const target = Math.max(0, Math.min(pos, view.state.doc.length))
  const travel = (): void => {
    const scroller = view.scrollDOM
    // Resolved once: the header's band is set from its own height, which a scroll doesn't change,
    // and the glide asks for its destination on every frame.
    const zone = headerZone(view)
    // The line's own position IS re-measured every frame. The editor only estimates the height of
    // blocks it hasn't drawn, so the destination sharpens as the travel reveals it — read live, the
    // glide eases into the true position; read once, it lands on the estimate and has to jump the
    // difference. `documentTop` is where the document currently begins on screen, which the scroll
    // itself moves.
    const seat = (): number =>
      scroller.scrollTop +
      (view.documentTop + view.lineBlockAt(target).top - scroller.getBoundingClientRect().top) -
      zone
    scrollGlide(scroller, seat, SEEK_GLIDE)
  }
  // A folded section has no height, so travelling before it opens measures the collapsed document and
  // stops short of the destination.
  if (expandFoldsAt(view, target)) setTimeout(travel, FOLD_SETTLE_MS)
  else travel()
}
