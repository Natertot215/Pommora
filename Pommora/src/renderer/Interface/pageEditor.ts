import type { EditorView } from '@codemirror/view'
import { headingOutline, sectionEnd } from '@renderer/MarkdownPM/Editor/folding'
import { travelTo } from '@renderer/MarkdownPM/Editor/travel'
import { blockMoveChanges } from '@renderer/MarkdownPM/Editor/listDragModel'
import { headingParts } from '@renderer/MarkdownPM/Detect'

// The open page's live editor — registered by the page surface at mount, so an embedded tile's
// or window's editor can never be picked up instead.
let pageView: EditorView | null = null

/** PageView hands its editor's view in at mount and null at teardown, through MarkdownEditor's
 *  `register` seam. */
export function registerPageEditor(view: EditorView | null): void {
  pageView = view
}

/** Travel the open page to `pos`, resolving the registered handle so a caller that only knows an
 *  offset doesn't have to hold a view. */
export function travelPageTo(pos: number): void {
  if (pageView) travelTo(pageView, pos)
}

/** Rewrite the text of the heading whose line begins at `from`, leaving its markers untouched.
 *  Written straight through the live editor, so the edit rides the page's normal autosave. The
 *  offset is re-resolved and re-checked as a heading, so a stale `from` is a no-op, not a bad write. */
export function renameHeadingAtOffset(from: number, next: string): void {
  const view = pageView
  if (!view) return
  const line = view.state.doc.lineAt(Math.max(0, Math.min(from, view.state.doc.length)))
  const parts = headingParts(line.text)
  if (!parts) return
  const contentStart = line.from + parts.indent.length + parts.hashes.length + parts.space.length
  view.dispatch({ changes: { from: contentStart, to: line.to, insert: next } })
}

/** Move the heading identified by `dragKey` and its whole section (down to the next heading of
 *  equal-or-higher level) to sit before `beforeKey`, or the document end when it's null. */
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
  // Stop at the section's last non-blank character — the mover re-fences with one blank, so
  // carrying the trailing blank too would compound an extra blank on every reorder.
  const range = { from, to: from + doc.slice(from, sectionEndPos).trimEnd().length }
  const at =
    beforeKey === null ? doc.length : (heads.find((x) => x.key === beforeKey)?.from ?? doc.length)
  const changes = blockMoveChanges(doc, range, { at })
  if (changes?.length) view.dispatch({ changes, userEvent: 'input' })
}
