import { StateEffect, StateField, type Extension } from '@codemirror/state'
import { EditorView, ViewPlugin } from '@codemirror/view'
import { linkMarkdown } from '@shared/PasteLink'
import { useSession } from '../../store'

// Page Title writes the Short Link first and swaps the label in when the fetch lands, because a
// title takes a round trip and often never arrives at all. What makes that safe is knowing WHICH
// link to swap: the same address pasted twice reads identically in both places, so the rewrite
// tracks the range it inserted — mapped through every edit since — and only fires while the text
// there is still exactly what was written.

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
          // Inward assoc on both ends, so text typed against either edge falls outside the span
          // rather than being absorbed into it and read as part of the label.
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
 *  waiting on. The subscription is torn down with the view, so a fetch resolving after a page closes
 *  — or after a table cell deactivates, which destroys its editor outright — reaches nothing. */
const sweepOnTitles = ViewPlugin.fromClass(
  class {
    private readonly unsubscribe: () => void

    constructor(view: EditorView) {
      // Fires on any store write, so the empty case has to stay the cheap one: a document with
      // nothing pending pays one array-length read.
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
        // An ordinary history entry: removing a paste whose title arrived takes two undos, which is
        // honest about the swap being a real edit (→ the plan's R1).
        view.dispatch({ changes, effects: titleSettled.of(settled) })
      })
    }

    destroy(): void {
      this.unsubscribe()
    }
  },
)

export const pendingTitle: Extension = [pendingTitles, sweepOnTitles]
