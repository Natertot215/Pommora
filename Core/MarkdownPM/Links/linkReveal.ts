import { StateEffect, StateField } from '@codemirror/state'

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
