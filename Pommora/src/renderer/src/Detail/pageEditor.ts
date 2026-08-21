import type { EditorView } from '@codemirror/view'
import { headingOutline, sectionEnd } from '@renderer/MarkdownPM/editor/folding'
import { travelTo } from '@renderer/MarkdownPM/editor/travel'
import { blockMoveChanges } from '@renderer/MarkdownPM/editor/listDragModel'
import { headingParts } from '@renderer/MarkdownPM/detect'

// The open page's live editor — registered by the page surface at mount, so an embedded tile's
// editor or the floating preview's can never be picked up instead.
let pageView: EditorView | null = null

/** The page surface's handle registration — PageView hands its editor's view in at mount and
 *  null at teardown, through MarkdownEditor's `register` seam. */
export function registerPageEditor(view: EditorView | null): void {
  pageView = view
}

/** Travel the OPEN PAGE to `pos` — the page-scoped call over the editor's own travel, resolving the
 *  registered handle so a caller that only knows an offset does not have to hold a view. */
export function travelPageTo(pos: number): void {
  if (pageView) travelTo(pageView, pos)
}

/** Rewrite the text of the heading whose line begins at `from`, leaving its markers (`#`s, indent,
 *  and the space after them) untouched. Written straight through the live editor, so the edit rides
 *  the page's normal autosave. The offset is re-resolved against the current doc and the line is
 *  re-checked as a heading, so a stale `from` from a body that trailed the editor is a no-op, not a
 *  wrong write. */
export function renameHeadingAtOffset(from: number, next: string): void {
  const view = pageView
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
  const view = pageView
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
