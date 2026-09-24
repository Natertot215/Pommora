import { reportRefusal, persist } from '@pommora/core/Interface/Notifications/notifications'
import type { EditorView } from '@codemirror/view'
import { travelTo } from '../MarkdownPM/travel'
import { docOutline, docScan } from '../MarkdownPM/docCache'
import { blockAt } from '../MarkdownPM/Engine/blockModel'
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
  const contentStart = line.from + parts.contentStart
  view.dispatch({ changes: { from: contentStart, to: line.to, insert: next } })
}

export async function renameHeading(pageId: string, old: string, next: string): Promise<void> {
  reportRefusal(await host().ask('connections:headingRenamed', pageId, old, next))
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
  if (shifted.some((k, i) => k !== keys[i]))
    await persist('folds', host().ask('folds:set', pageId, shifted), true)
}

export function moveHeadingSection(dragKey: string, beforeKey: string | null): void {
  const view = pageView
  if (!view) return
  const scan = docScan(view.state.doc)
  const heads = docOutline(view.state.doc)
  const drag = heads.find((x) => x.key === dragKey)
  const at =
    beforeKey === null
      ? scan.lineStarts[scan.citations.firstLine]
      : heads.find((x) => x.key === beforeKey)?.from
  if (!drag || at === undefined) return
  const changes = moveRange(scan.text, blockAt(scan, drag.from)!, { at })
  if (changes?.length) view.dispatch({ changes, userEvent: 'input' })
}
