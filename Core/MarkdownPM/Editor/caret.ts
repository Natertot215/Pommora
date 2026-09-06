// A drawn caret via a CM `layer`, geometry only. Only the native caret is hidden, not the selection — unlike
// drawSelection's all-or-nothing takeover.
import { layer, RectangleMarker, type EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { embedTileRanges } from './embedWidget'

// A doc-edge tile owns the only legal seats inside its atomic span, and measuring those yields the tile box
// itself — so draw where the seat's insertion will land, one line above or below the tile.
function tileEdgeMarker(view: EditorView, head: number): RectangleMarker | null {
  const tile = embedTileRanges(view.state).find((t) => head === t.from || head === t.to)
  if (!tile) return null
  const lb = view.lineBlockAt(tile.from)
  const sr = view.scrollDOM.getBoundingClientRect()
  const cr = view.contentDOM.getBoundingClientRect()
  const cs = getComputedStyle(view.contentDOM)
  // Body height, not defaultLineHeight — CM measures the latter off its default font, taller than body lines render.
  const lh = Number.parseFloat(cs.lineHeight) || view.defaultLineHeight
  const left = cr.left + Number.parseFloat(cs.paddingLeft) - (sr.left - view.scrollDOM.scrollLeft)
  const topDoc = head === tile.to ? lb.bottom : lb.top - lh
  const top = view.documentTop + topDoc - (sr.top - view.scrollDOM.scrollTop)
  return new RectangleMarker('mdpm-caret', left, top, null, lh)
}

// A cursor against a block widget makes forRange return a marker spanning the whole widget, so anything far
// taller than a text line comes back one line tall.
export function clampToLine(view: EditorView, cls: string, m: RectangleMarker): RectangleMarker {
  const cap = view.defaultLineHeight * 2.5
  const floor = 4
  return m.height > cap || m.height < floor
    ? new RectangleMarker(cls, m.left, m.top, m.width, view.defaultLineHeight)
    : m
}

function caretMarkers(view: EditorView): RectangleMarker[] {
  const out: RectangleMarker[] = []
  for (const r of view.state.selection.ranges) {
    if (r.empty) {
      const edge = tileEdgeMarker(view, r.head)
      if (edge) {
        out.push(edge)
        continue
      }
    }
    const cursor = r.empty ? r : EditorSelection.cursor(r.head, r.assoc)
    // A seat whose assoc side faces a replaced range has no coords there — flip to the surviving side.
    let markers = RectangleMarker.forRange(view, 'mdpm-caret', cursor)
    if (markers.length === 0)
      markers = RectangleMarker.forRange(
        view,
        'mdpm-caret',
        EditorSelection.cursor(cursor.head, (cursor.assoc || 1) > 0 ? -1 : 1),
      )
    for (const m of markers) out.push(clampToLine(view, 'mdpm-caret', m))
  }
  return out
}

export const customCaret = layer({
  above: true,
  class: 'mdpm-caret-layer',
  markers: caretMarkers,
  update(update, dom) {
    // Swap the keyframe name on any selection change so the caret reads solid the instant it moves.
    if (update.transactions.some((tr) => tr.selection))
      dom.style.animationName =
        dom.style.animationName === 'mdpm-blink2' ? 'mdpm-blink' : 'mdpm-blink2'
    return update.docChanged || update.selectionSet
  },
})
