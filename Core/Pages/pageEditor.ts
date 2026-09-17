import type { EditorView } from '@codemirror/view'
import { headingOutline, sectionEnd } from '../MarkdownPM/Engine/headingScan'
import { travelTo } from '../MarkdownPM/travel'
import { moveRange } from '../MarkdownPM/Engine/listDragModel'
import { headingParts } from '../MarkdownPM/Engine/detect'
import { valueOr } from '../Contract/result'
import { host } from '../Platform/dialer'

// Registered by the page surface at mount, so an embedded tile's or window's editor can never be picked up instead.
let pageView: EditorView | null = null

export function registerPageEditor(view: EditorView | null): void {
  pageView = view
}

export function travelPageTo(pos: number): void {
  if (pageView) travelTo(pageView, pos)
}

/** The offset is re-resolved and re-checked as a heading, so a stale `from` is a no-op, not a bad write. */
export function renameHeadingAtOffset(from: number, next: string): void {
  const view = pageView
  if (!view) return
  const line = view.state.doc.lineAt(Math.max(0, Math.min(from, view.state.doc.length)))
  const parts = headingParts(line.text)
  if (!parts) return
  const contentStart = line.from + parts.indent.length + parts.hashes.length + parts.space.length
  view.dispatch({ changes: { from: contentStart, to: line.to, insert: next } })
}

export async function renameHeading(pageId: string, old: string, next: string): Promise<void> {
  await host().ask('connections:headingRenamed', pageId, old, next)
  const keys = valueOr(await host().ask('folds:get'), {})[pageId]
  if (!keys?.length) return
  // A duplicate's key is `${text} ${n}`; a longer heading that happens to start with the text is its own.
  const shifted = keys.map((k) =>
    k === old
      ? next
      : /^ \d+$/.test(k.slice(old.length)) && k.startsWith(old)
        ? `${next}${k.slice(old.length)}`
        : k,
  )
  if (shifted.some((k, i) => k !== keys[i])) await host().ask('folds:set', pageId, shifted)
}

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
  // Stop at the section's last non-blank character — the mover re-fences with one blank, so carrying the trailing blank too would compound an extra blank on every reorder.
  const range = { from, to: from + doc.slice(from, sectionEndPos).trimEnd().length }
  const at =
    beforeKey === null ? doc.length : (heads.find((x) => x.key === beforeKey)?.from ?? doc.length)
  const changes = moveRange(doc, range, { at })
  if (changes?.length) view.dispatch({ changes, userEvent: 'input' })
}
