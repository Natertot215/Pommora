import { StateEffect, StateField, type Extension } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'
import { linkMarkdown } from '@shared/PasteLink'
import { useSession } from '../../store'

// Page Title writes the Short Link first and swaps the label in when the fetch lands, since a
// title takes a round trip and may never arrive. To know WHICH link to swap when the same address
// is pasted twice, the rewrite tracks the range it inserted (mapped through every later edit) and
// only fires while the text there still matches exactly what was written.

export interface PendingTitle {
  from: number
  to: number
  url: string
  /** What was written. The rewrite declines unless the range still reads as this. */
  text: string
}

/** Announce a link just written in Page Title form, still standing in with its domain. */
export const awaitTitle = StateEffect.define<PendingTitle>()

/** Withdraw anchors the sweep has finished with. */
const titleSettled = StateEffect.define<readonly PendingTitle[]>()

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
      if (e.is(awaitTitle)) next = [...next, e.value]
      else if (e.is(titleSettled)) next = next.filter((p) => !e.value.includes(p))
    }
    return next
  },
})

/** Watches the shared title cache and swaps in whatever lands, for the links this editor is still
 *  waiting on. The subscription is torn down with the view, so a fetch resolving after the page or
 *  a deactivated table-cell editor closes reaches nothing. */
const sweepOnTitles = ViewPlugin.fromClass(
  class {
    private readonly unsubscribe: () => void

    constructor(view: EditorView) {
      // Fires on any store write, so the empty case must stay cheap: one array-length read.
      this.unsubscribe = useSession.subscribe(() => {
        const pending = view.state.field(pendingTitles, false)
        if (!pending || pending.length === 0) return
        const { linkTitles } = useSession.getState()
        const changes: { from: number; to: number; insert: string }[] = []
        const settled: PendingTitle[] = []
        for (const p of pending) {
          const title = linkTitles[p.url]
          if (title === undefined) continue
          settled.push(p)
          const text = linkMarkdown(p.url, 'link-title', title)
          if (text !== p.text) changes.push({ from: p.from, to: p.to, insert: text })
        }
        if (settled.length === 0) return
        // An ordinary history entry: removing a paste whose title arrived takes two undos, since
        // the swap is a real edit.
        view.dispatch({ changes, effects: titleSettled.of(settled) })
      })
    }

    destroy(): void {
      this.unsubscribe()
    }
  },
)

export const pendingTitle: Extension = [pendingTitles, sweepOnTitles]
