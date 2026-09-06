// Going somewhere in an editor, opening whatever conceals it — an editor capability, so every surface that mounts one can want it.
import { clamp } from '@pommora/uix/Utilities/clamp'
import type { EditorView } from '@codemirror/view'
import { SEEK_GLIDE, scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { FOLD_SETTLE_MS, expandFoldsAt } from './folding'

const REVEAL_MARGIN = 12

/** Landing on the header's band rather than the viewport's edge stops an arriving line from being jammed against the top. */
function headerZone(view: EditorView): number {
  const shell = view.dom.closest('.mdpm-shell')
  if (!shell) return REVEAL_MARGIN
  const zone = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--header-zone'))
  return Number.isFinite(zone) ? zone : REVEAL_MARGIN
}

/** The document and the caret are untouched, but a collapsed section is opened: arriving at a heading whose body is
 *  still folded is indistinguishable from having gone nowhere. */
export function travelTo(view: EditorView, pos: number): void {
  // A caller's offset can come from a body that trails the editor's own doc by a beat.
  const target = clamp(pos, 0, view.state.doc.length)
  const travel = (): void => {
    // A reveal defers this past its own animation, and a tab closed in between takes the editor with it.
    if (!view.dom.isConnected) return
    const scroller = view.scrollDOM
    const zone = headerZone(view)
    // Re-measured every frame: the editor only estimates the height of blocks it hasn't drawn, so read live the
    // glide eases into the true position; read once, it lands on the estimate and jumps the difference.
    const seat = (): number =>
      scroller.scrollTop +
      (view.documentTop + view.lineBlockAt(target).top - scroller.getBoundingClientRect().top) -
      zone
    scrollGlide(scroller, seat, SEEK_GLIDE)
  }
  // A folded section has no height, so travelling before it opens measures the collapsed document.
  if (expandFoldsAt(view, target)) setTimeout(travel, FOLD_SETTLE_MS)
  else travel()
}
