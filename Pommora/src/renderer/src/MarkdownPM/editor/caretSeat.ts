// The three caret placements every editor surface performs. They live apart from the input keymap
// because both sides of a construct's authoring — the transforms that run on a keystroke and the
// appliers that run from a menu — need them, and neither should have to import the other to seat a
// caret.
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export function focusAt(view: EditorView, pos: number): void {
  view.dispatch({ selection: { anchor: pos } })
  view.focus()
}

/** Seat the caret inside a span, selecting it when `to` differs. `assoc` is explicit for the bare
 *  caret: a position on the boundary of a replaced range draws no caret without it, and every span
 *  worth seating into here abuts hidden marker text. */
export function focusRange(view: EditorView, from: number, to = from): void {
  view.dispatch({
    selection: from === to ? EditorSelection.cursor(from, 1) : EditorSelection.range(from, to),
  })
  view.focus()
}

/** Seat the caret at whichever end of `range` the pointer was nearer, for a press that clamped into
 *  a token it never visually touched. A hidden marker is zero width, so `posAtCoords` maps the space
 *  beside such a token onto offsets inside it; without this the caret lands mid-word somewhere the
 *  pointer never was. Reports whether it acted, so the handler knows to claim the press. */
export function seatAtNearerEdge(
  view: EditorView,
  pos: number,
  [from, to]: [number, number],
): boolean {
  if (pos <= from || pos >= to) return false
  focusAt(view, pos - from < to - pos ? from : to)
  return true
}
