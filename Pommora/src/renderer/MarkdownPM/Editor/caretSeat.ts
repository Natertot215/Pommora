// The three caret placements every editor surface performs. Live apart from the input keymap since
// both the keystroke transforms and the menu appliers need them without importing each other.
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export function focusAt(view: EditorView, pos: number): void {
  view.dispatch({ selection: { anchor: pos } })
  view.focus()
}

/** Seat the caret inside a span, selecting it when `to` differs. `assoc` is explicit for the bare
 *  caret: a position on the boundary of a replaced range draws no caret without it. */
export function focusRange(view: EditorView, from: number, to = from): void {
  view.dispatch({
    selection: from === to ? EditorSelection.cursor(from, 1) : EditorSelection.range(from, to),
  })
  view.focus()
}

/** Seat the caret at whichever end of `range` the pointer was nearer, for a press that clamped into
 *  a token it never visually touched (a hidden marker is zero width, so `posAtCoords` maps the space
 *  beside it onto offsets inside it). Reports whether it acted, so the handler knows to claim the press. */
export function seatAtNearerEdge(
  view: EditorView,
  pos: number,
  [from, to]: [number, number],
): boolean {
  if (pos <= from || pos >= to) return false
  focusAt(view, pos - from < to - pos ? from : to)
  return true
}
