import { clamp } from '@pommora/uix/Utilities/clamp'
import type { EditorView } from '@codemirror/view'
import { SEEK_GLIDE, scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { normalizeTitle } from '../Connections/connections'
import { docOutline } from './docCache'
import type { OutlineHeading } from './Engine/headingScan'
import { FOLD_SETTLE_MS, expandFoldsAt } from './folding'

const REVEAL_MARGIN = 12

// A window's page grows to its content, so the window body scrolls it rather than the editor; a page embedded in it keeps its own scroller.
const scrollerOf = (view: EditorView): HTMLElement => {
  const body = view.dom.closest('.page-tile')?.parentElement
  return body?.classList.contains('page-tile-grows') ? body : view.scrollDOM
}

/** Landing on the header's band rather than the viewport's edge stops an arriving line from being jammed against the top. */
function headerZone(view: EditorView): number {
  const shell = view.dom.closest('.mdpm-shell')
  if (!shell) return REVEAL_MARGIN
  const zone = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--header-zone'))
  return Number.isFinite(zone) ? zone : REVEAL_MARGIN
}

export function travelTo(view: EditorView, pos: number): void {
  // A caller's offset can come from a body that trails the editor's own doc by a beat.
  const target = clamp(pos, 0, view.state.doc.length)
  const travel = (): void => {
    // A reveal defers this past its own animation, and a tab closed in between takes the editor with it.
    if (!view.dom.isConnected) return
    const scroller = scrollerOf(view)
    const zone = headerZone(view)
    // Re-measured every frame: the editor only estimates the height of blocks it hasn't drawn, so reading once lands on the estimate and jumps the difference.
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

export function nearestHeading(
  outline: readonly OutlineHeading[],
  heading: string,
  near: number,
): number | null {
  const key = normalizeTitle(heading)
  let best: number | null = null
  for (const h of outline) {
    if (normalizeTitle(h.text) !== key) continue
    if (best === null || Math.abs(h.from - near) < Math.abs(best - near)) best = h.from
  }
  return best
}

// Heights are relative to `documentTop`, so the scroller's top edge is converted before the block is read.
export function travelToHeading(view: EditorView, heading: string, near?: number): void {
  const top = scrollerOf(view).getBoundingClientRect().top - view.documentTop
  const at = nearestHeading(
    docOutline(view.state.doc),
    heading,
    near ?? view.lineBlockAtHeight(top).from,
  )
  if (at !== null) travelTo(view, at)
}
