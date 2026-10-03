import { useSyncExternalStore } from 'react'
import type { EditorView } from '@codemirror/view'
import type { OutlineHeading } from '../MarkdownPM/Engine/headingScan'
import { travelTo } from '../MarkdownPM/travel'
import { docOutline, docScan } from '../MarkdownPM/docCache'
import { blockAt } from '../MarkdownPM/Engine/blockModel'
import { moveRange } from '../MarkdownPM/Engine/listDragModel'
import { headingParts } from '../MarkdownPM/Engine/detect'
import { pageBody, shownPage, useSession } from '../Session/store'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { channel } from '@pommora/uix/Utilities/subscribable'

// Registered by the page surface at mount, so an embedded tile's or window's editor can never be picked up instead.
const pageView = channel<EditorView | null>(null)

export const registerPageEditor = pageView.set

// Re-read on each settled body and on each registration: the editor a page switch mounts registers after the render that showed its body.
export function usePageOutline(): OutlineHeading[] {
  useSession((st) => pageBody(shownPage(st)))
  const view = useSyncExternalStore(pageView.subscribe, pageView.get)
  return view ? docOutline(view.state.doc) : []
}

export function travelPageTo(pos: number): void {
  const view = pageView.get()
  if (view) travelTo(view, pos)
}

/** The offset is re-resolved and re-checked as a heading, so a stale `from` is a no-op, not a bad write. */
export function renameHeadingAtOffset(from: number, next: string): void {
  const view = pageView.get()
  if (!view) return
  const line = view.state.doc.lineAt(clamp(from, 0, view.state.doc.length))
  const parts = headingParts(line.text)
  if (!parts) return
  const contentStart = line.from + parts.contentStart
  view.dispatch({ changes: { from: contentStart, to: line.to, insert: next } })
}

export function moveHeadingSection(dragKey: string, beforeKey: string | null): void {
  const view = pageView.get()
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
