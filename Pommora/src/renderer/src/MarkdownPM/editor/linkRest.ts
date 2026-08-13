import { StateEffect, StateField } from '@codemirror/state'

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
