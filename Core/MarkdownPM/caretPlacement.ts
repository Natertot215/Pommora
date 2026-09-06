import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export function focusAt(view: EditorView, pos: number): void {
  view.dispatch({ selection: { anchor: pos } })
  view.focus()
}

/** `assoc` is explicit for the bare caret: a position on the boundary of a replaced range draws no caret without it. */
export function focusRange(view: EditorView, from: number, to = from): void {
  view.dispatch({
    selection: from === to ? EditorSelection.cursor(from, 1) : EditorSelection.range(from, to),
  })
  view.focus()
}

/** Seats at whichever end of `range` the pointer was nearer: a hidden marker is zero width, so `posAtCoords` maps the space beside it onto offsets inside it. Reports whether it acted. */
export function seatAtNearerEdge(
  view: EditorView,
  pos: number,
  [from, to]: [number, number],
): boolean {
  if (pos <= from || pos >= to) return false
  focusAt(view, pos - from < to - pos ? from : to)
  return true
}
