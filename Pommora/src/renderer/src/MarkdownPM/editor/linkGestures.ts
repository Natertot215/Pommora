import { StateEffect, StateField } from '@codemirror/state'
import { linkAt } from '@shared/connections'

// Two facts about a link that no offset can carry, because both are about the gesture that put the
// caret where it is rather than about where that is. Each is set by the transaction that earns it
// and taken back by whatever the user does next.

/** Announce that a link was just finished, with the caret left on its closer. */
export const restedOnLink = StateEffect.define<number>()

/** Where a link was just finished, or null.
 *
 *  Finishing a link — pressing Enter on an alias, accepting a page from the picker — leaves the
 *  caret on the closer, and the link should read as finished there rather than springing back into
 *  raw syntax. But that is true of the *gesture*, not of the position: clicking beside a link is
 *  aiming at its syntax, and must still reveal it. A token can't tell the two apart from offsets
 *  alone, so the finishing transaction says so and anything the user does next takes it back. */
export const linkRest = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(restedOnLink)) return e.value
    // Any further transaction is the user doing something else — a click, a keystroke, an edit.
    return tr.docChanged || tr.selection ? null : value
  },
})

/** The link the caret is currently TYPING inside, as that link's start, or null.
 *
 *  A connection takes the connection colour from its first character rather than reading as prose
 *  until a title happens to match. But that belongs to writing one: clicking into a link that names
 *  no page is inspecting an unresolved link, and it should look unresolved. Typing keeps this alive
 *  keystroke by keystroke; moving the caret without editing ends it. */
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
