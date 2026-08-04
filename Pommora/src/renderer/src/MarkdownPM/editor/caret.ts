// A drawn caret via a CM `layer` (shape + fade are CSS; this file is geometry only). Only the native caret is
// hidden (`caret-color: transparent`), not the selection — so this is NOT drawSelection's all-or-nothing takeover.
import { layer, RectangleMarker, type EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

function caretMarkers(view: EditorView): RectangleMarker[] {
  // A cursor placed against a block widget (e.g. a table) makes forRange return a marker spanning the whole
  // widget — a giant, mis-placed caret. Clamp anything far taller than a text line back to one line's height.
  const cap = view.defaultLineHeight * 2.5 // headings (~1.8em) stay tall; a widget-spanning marker is clamped
  const floor = 4 // under this a marker is a collapsed line's sliver (an embed's fencing blank), not a caret
  const out: RectangleMarker[] = []
  for (const r of view.state.selection.ranges) {
    const cursor = r.empty ? r : EditorSelection.cursor(r.head, r.assoc)
    // A seat whose assoc side faces a replaced range has no coords on that side, and forRange
    // returns nothing — the caret would silently not render at any seat bordering an embed tile.
    // The surviving side always measures; flip to it.
    let markers = RectangleMarker.forRange(view, 'mdpm-caret', cursor)
    if (markers.length === 0)
      markers = RectangleMarker.forRange(
        view,
        'mdpm-caret',
        EditorSelection.cursor(cursor.head, (cursor.assoc || 1) > 0 ? -1 : 1),
      )
    // Either end of the legible band takes the same repair — one line's height at the marker's own
    // seat, so a widget-spanning marker shrinks to a caret and a collapsed seam draws one at all.
    for (const m of markers)
      out.push(
        m.height > cap || m.height < floor
          ? new RectangleMarker('mdpm-caret', m.left, m.top, m.width, view.defaultLineHeight)
          : m,
      )
  }
  return out
}

export const customCaret = layer({
  above: true,
  class: 'mdpm-caretLayer',
  markers: caretMarkers,
  update(update, dom) {
    // Swap the keyframe name on any selection change so the fade restarts — the caret reads solid the
    // instant it moves, rather than mid-fade. Same trick CM's own cursor layer uses.
    if (update.transactions.some((tr) => tr.selection))
      dom.style.animationName =
        dom.style.animationName === 'mdpm-blink2' ? 'mdpm-blink' : 'mdpm-blink2'
    return update.docChanged || update.selectionSet
  },
})
