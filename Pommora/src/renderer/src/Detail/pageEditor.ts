import { EditorView } from '@codemirror/view'
import { duration } from '@renderer/design-system/tokens/motion'
import { type GlideParams, scrollGlide } from '@renderer/design-system/interactions/autoscroll'
import { expandFoldsAt } from '@renderer/MarkdownPM/editor/folding'

// ── KNOBS — how the page travels to a heading ──
const GLIDE: GlideParams = {
  speed: 3, // px per ms
  minMs: Number.parseInt(duration.fast, 10),
  maxMs: Number.parseInt(duration.slow, 10),
}

// Fallback inset, used only where the page header hasn't published its height yet.
const REVEAL_MARGIN = 12

/** Where a jumped-to heading settles: the band the page header occupies, which the body already pads
 *  itself by and which is exactly where a page's own inline title reads. Landing there rather than at
 *  the viewport's edge stops an arriving heading from being jammed against the top. */
function headerZone(view: EditorView): number {
  const shell = view.dom.closest('.mdpm-shell')
  if (!shell) return REVEAL_MARGIN
  const zone = Number.parseFloat(getComputedStyle(shell).getPropertyValue('--header-zone'))
  return Number.isFinite(zone) ? zone : REVEAL_MARGIN
}
// The reveal's own beat plus a frame, so the scroll measures the section at its opened height.
const SETTLE_MS = Number.parseInt(duration.disclosure, 10) + 30

/** The open page's live editor. Scoped to the detail pane and taken in document order, so an embedded
 *  tile's own editor — which nests inside this one — is never picked up instead, and the floating
 *  preview stays out of reach as its own surface. */
function pageEditorView(): EditorView | null {
  const host = document.querySelector('.detail-page .cm-editor')
  return host instanceof HTMLElement ? EditorView.findFromDOM(host) : null
}

/** Travel the open page to `pos`, opening whatever was hiding it. The document and the caret are
 *  untouched — going somewhere never edits it or moves where the next keystroke lands — but a
 *  collapsed section IS opened, because arriving at a heading whose body is still folded is
 *  indistinguishable from having gone nowhere. */
export function revealPageOffset(pos: number): void {
  const view = pageEditorView()
  if (!view) return
  // The outline is derived from the store's body, which can trail the editor's own doc by a beat.
  const target = Math.max(0, Math.min(pos, view.state.doc.length))
  const travel = (): void => {
    const scroller = view.scrollDOM
    // Re-measured every frame, not resolved once. The editor only estimates the height of blocks it
    // hasn't drawn, so the destination sharpens as the travel reveals it — read live, the glide eases
    // into the true position; read once, it lands on the estimate and has to jump the difference.
    // `documentTop` is where the document currently begins on screen, which the scroll itself moves.
    const seat = (): number =>
      scroller.scrollTop +
      (view.documentTop + view.lineBlockAt(target).top - scroller.getBoundingClientRect().top) -
      headerZone(view)
    scrollGlide(scroller, seat, GLIDE)
  }
  // A folded section has no height, so travelling before it opens measures the collapsed document and
  // stops short of the heading.
  if (expandFoldsAt(view, target)) setTimeout(travel, SETTLE_MS)
  else travel()
}
