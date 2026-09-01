// Going somewhere in an editor, opening whatever conceals it. An editor capability rather than a
// page-surface one, so every surface that mounts an editor can want it.
import type { EditorView } from '@codemirror/view'
import { SEEK_GLIDE, scrollGlide } from '@renderer/DesignSystem/Interactions/autoscroll'
import { FOLD_SETTLE_MS, expandFoldsAt } from './folding'

// Fallback inset, used only where the page header hasn't published its height yet.
const REVEAL_MARGIN = 12

/** Where a jumped-to line settles: the band the page header occupies. Landing there rather than at
 *  the viewport's edge stops an arriving line from being jammed against the top. */
function headerZone(view: EditorView): number {
  const shell = view.dom.closest('.mdpm-shell')
  if (!shell) return REVEAL_MARGIN
  const zone = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--header-zone'))
  return Number.isFinite(zone) ? zone : REVEAL_MARGIN
}

/** Travel `view` to `pos`, opening whatever was hiding it. The document and the caret are untouched
 *  — going somewhere never edits it — but a collapsed section is opened, since arriving at a
 *  heading whose body is still folded is indistinguishable from having gone nowhere. */
export function travelTo(view: EditorView, pos: number): void {
  // A caller's offset can come from a body that trails the editor's own doc by a beat.
  const target = Math.max(0, Math.min(pos, view.state.doc.length))
  const travel = (): void => {
    // A reveal defers this past its own animation, and a tab closed or a page swapped in between
    // takes the editor with it.
    if (!view.dom.isConnected) return
    const scroller = view.scrollDOM
    const zone = headerZone(view)
    // Re-measured every frame: the editor only estimates the height of blocks it hasn't drawn, so
    // the destination sharpens as the travel reveals it — read live, the glide eases into the true
    // position; read once, it lands on the estimate and has to jump the difference.
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
