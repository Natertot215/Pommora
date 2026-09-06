import { StateEffect, StateField } from '@codemirror/state'
import { linkAt } from '@pommora/core/Connections/connections'

// Two facts about a link that no offset can carry, since both are about the gesture that put the caret where it is.

export const restedOnLink = StateEffect.define<number>()

/** Where a link was just finished, or null. Finishing one leaves the caret on the closer and it should read as
 *  finished there — but that is true of the GESTURE, not the position: clicking beside a link is aiming at its
 *  syntax and must still reveal it. Offsets alone can't tell the two apart. */
export const linkRest = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(restedOnLink)) return e.value
    // Any further transaction is the user doing something else — a click, a keystroke, an edit.
    return tr.docChanged || tr.selection ? null : value
  },
})

/** The link the caret is currently typing inside, as that link's start. A connection takes its color from the
 *  first character, but that belongs to WRITING one — clicking into a link that names no page is inspecting it. */
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
