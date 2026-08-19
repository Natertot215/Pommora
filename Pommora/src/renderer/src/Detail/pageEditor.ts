import type { EditorView } from '@codemirror/view'
import { duration } from '@renderer/design-system/tokens/motion'
import { SEEK_GLIDE, scrollGlide } from '@renderer/design-system/interactions/autoscroll'
import { expandFoldsAt, headingOutline, sectionEnd } from '@renderer/MarkdownPM/editor/folding'
import { blockMoveChanges } from '@renderer/MarkdownPM/editor/listDragModel'
import { headingParts } from '@renderer/MarkdownPM/detect'

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

// The open page's live editor — registered by the page surface at mount, so an embedded tile's
// editor or the floating preview's can never be picked up instead.
let pageView: EditorView | null = null

/** The page surface's handle registration — PageView hands its editor's view in at mount and
 *  null at teardown, through MarkdownEditor's `register` seam. */
export function registerPageEditor(view: EditorView | null): void {
  pageView = view
}

function pageEditorView(): EditorView | null {
  return pageView
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
    scrollGlide(scroller, seat, SEEK_GLIDE)
  }
  // A folded section has no height, so travelling before it opens measures the collapsed document and
  // stops short of the heading.
  if (expandFoldsAt(view, target)) setTimeout(travel, SETTLE_MS)
  else travel()
}

/** Rewrite the text of the heading whose line begins at `from`, leaving its markers (`#`s, indent,
 *  and the space after them) untouched. Written straight through the live editor, so the edit rides
 *  the page's normal autosave. The offset is re-resolved against the current doc and the line is
 *  re-checked as a heading, so a stale `from` from a body that trailed the editor is a no-op, not a
 *  wrong write. */
export function renameHeadingAtOffset(from: number, next: string): void {
  const view = pageEditorView()
  if (!view) return
  const line = view.state.doc.lineAt(Math.max(0, Math.min(from, view.state.doc.length)))
  const parts = headingParts(line.text)
  if (!parts) return
  const contentStart = line.from + parts.indent.length + parts.hashes.length + parts.space.length
  view.dispatch({ changes: { from: contentStart, to: line.to, insert: next } })
}

/** Move the heading identified by `dragKey` — and its whole section (body + sub-headings, everything
 *  down to the next heading of equal-or-higher level) — to sit before the heading `beforeKey`, or to
 *  the document end when it's null. Levels are untouched; the outline re-nests the moved section by
 *  level on its own. Offsets are recomputed from the LIVE doc by heading key (the outline body can
 *  trail the editor by a beat), and `blockMoveChanges` carries the blank-line fencing, so the section
 *  never lands jammed against a neighbor. */
export function moveHeadingSection(dragKey: string, beforeKey: string | null): void {
  const view = pageEditorView()
  if (!view) return
  const doc = view.state.doc.toString()
  const heads = headingOutline(doc)
  const h = heads.findIndex((x) => x.key === dragKey)
  if (h < 0) return
  const end = sectionEnd(heads, h)
  const from = heads[h].from
  const sectionEndPos = end < heads.length ? heads[end].from : doc.length
  // Stop the range at the section's last non-blank character, not the blank line before the next
  // heading — the mover re-fences with one blank, so carrying the trailing blank too would compound
  // an extra blank on every reorder.
  const range = { from, to: from + doc.slice(from, sectionEndPos).trimEnd().length }
  const at =
    beforeKey === null ? doc.length : (heads.find((x) => x.key === beforeKey)?.from ?? doc.length)
  const changes = blockMoveChanges(doc, range, { at })
  if (changes?.length) view.dispatch({ changes, userEvent: 'input' })
}
