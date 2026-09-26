import { StateEffect, StateField } from '@codemirror/state'
import { linkAt } from '@pommora/core/Connections/connections'

export const restedOnLink = StateEffect.define<number>()

/** Finishing a link leaves the caret on the closer and it should read as finished there — but that is true of the GESTURE, not the position: clicking beside a link is aiming at its syntax and must still reveal it. */
export const linkRest = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(restedOnLink)) return e.value
    // Any further transaction is the user doing something else — a click, a keystroke, an edit.
    return tr.docChanged || tr.selection ? null : value
  },
})

/** A connection takes its color from the first character, but that belongs to WRITING one — clicking into a link that names no page is inspecting it. */
export const linkTyping = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    if (!tr.docChanged) return tr.selection ? null : value
    const head = tr.newSelection.main.head
    const line = tr.newDoc.lineAt(head)
    const s = linkAt(line.text, head - line.from)
    return s ? line.from + s.full[0] : null
  },
})
