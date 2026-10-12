import { StateEffect, StateField } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { linkMarkdown } from '../../Connections/linkValue'
import { type EditorHost, editorHost } from '../api'

// Page Title writes the Short Link first and swaps the title in when the fetch lands. Each write awaits its own fetch; to know WHICH link to swap when the same address is pasted twice, the entry tracks the range it inserted and fires only while the text there still matches exactly what was written.

export interface PendingTitle {
  from: number
  to: number
  url: string
  text: string
}

export const awaitTitle = StateEffect.define<PendingTitle>()

const titleSettled = StateEffect.define<PendingTitle>()

export const pendingTitles = StateField.define<readonly PendingTitle[]>({
  create: () => [],
  update(value, tr) {
    let next = value
    if (tr.docChanged && next.length > 0) {
      next = next
        .map((p) => ({
          ...p,
          // Inward assoc on both ends, so text typed against either edge falls outside the span.
          from: tr.changes.mapPos(p.from, 1),
          to: tr.changes.mapPos(p.to, -1),
        }))
        // The label was edited, or the link deleted — either way these are the user's words now.
        .filter((p) => p.to > p.from && tr.state.sliceDoc(p.from, p.to) === p.text)
    }
    for (const e of tr.effects) {
      if (e.is(awaitTitle)) {
        if (tr.state.sliceDoc(e.value.from, e.value.to) === e.value.text) next = [...next, e.value]
      } else if (e.is(titleSettled)) next = next.filter((p) => p !== e.value)
    }
    return next
  },
})

export function writeLinkAt(
  view: EditorView,
  from: number,
  to: number,
  write: { text: string; awaits?: string },
  userEvent: string,
): void {
  const end = from + write.text.length
  const entry = write.awaits ? { from, to: end, url: write.awaits, text: write.text } : null
  view.dispatch({
    changes:
      view.state.sliceDoc(from, to) === write.text ? undefined : { from, to, insert: write.text },
    selection: { anchor: end },
    userEvent,
    scrollIntoView: true,
    effects: entry ? awaitTitle.of(entry) : undefined,
  })
  if (!entry) return
  void settledLinkText(view.state.facet(editorHost), write).then((text) => {
    if (!view.dom.isConnected) return
    const held = view.state
      .field(pendingTitles)
      .find((p) => p.url === entry.url && p.text === entry.text)
    if (!held) return
    view.dispatch({
      changes: text === held.text ? undefined : { from: held.from, to: held.to, insert: text },
      effects: titleSettled.of(held),
    })
  })
}

export function forwardTitles(
  host: EditorHost,
  entries: readonly PendingTitle[],
  text: () => string | null,
  commit: (next: string) => void,
): void {
  for (const p of entries)
    void settledLinkText(host, { text: p.text, awaits: p.url }).then((titled) => {
      const held = text()
      if (titled === p.text || held === null || held.slice(p.from, p.to) !== p.text) return
      commit(held.slice(0, p.from) + titled + held.slice(p.to))
    })
}

export async function settledLinkText(
  host: EditorHost,
  write: { text: string; awaits?: string },
): Promise<string> {
  if (!write.awaits) return write.text
  const title = await host.linkTitles.resolve(write.awaits)
  return title ? linkMarkdown(write.awaits, 'link-title', title) : write.text
}
