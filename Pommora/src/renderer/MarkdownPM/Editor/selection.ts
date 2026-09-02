// The drawn selection via a CM `layer` seated BELOW the text, so the tint sits behind the glyphs the way a
// native highlight does. Geometry only — fill, corner and bleed are text-selection.css.
import { layer, RectangleMarker, type EditorView } from '@codemirror/view'
import { EditorSelection, type SelectionRange } from '@codemirror/state'
import { clampToLine } from './caret'

const CLS = 'mdpm-sel'

function caretEdge(view: EditorView, pos: number, assoc: 1 | -1): RectangleMarker | undefined {
  const [m] = RectangleMarker.forRange(view, CLS, EditorSelection.cursor(pos, assoc))
  return m && clampToLine(view, CLS, m)
}

const corner = (i: number, n: number): string =>
  n === 1 ? `${CLS}-solo` : i === 0 ? `${CLS}-head` : i === n - 1 ? `${CLS}-foot` : ''

// CM hands back a contiguous, already-viewport-clipped ribbon, so the interior seams are gap-free as given
// and only the OUTER bound is line-box tall where the caret is shorter — "caret-bound" is exactly two edits.
// An edge the viewport clipped is a continuation rather than an end, and keeps its own box.
function rangeMarkers(view: EditorView, range: SelectionRange): RectangleMarker[] {
  const pieces = RectangleMarker.forRange(view, CLS, range)
  const last = pieces.length - 1
  const head = range.from >= view.viewport.from ? caretEdge(view, range.from, 1) : undefined
  const foot = range.to <= view.viewport.to ? caretEdge(view, range.to, -1) : undefined
  return pieces.map((m, i) => {
    const top = i === 0 && head ? head.top : m.top
    const bottom = i === last && foot ? foot.top + foot.height : m.top + m.height
    return new RectangleMarker(
      `${CLS} ${corner(i, pieces.length)}`.trim(),
      m.left,
      top,
      m.width,
      Math.max(bottom - top, 1),
    )
  })
}

export const customSelection = layer({
  above: false,
  class: 'mdpm-sel-layer',
  markers: (view) =>
    view.state.selection.ranges.filter((r) => !r.empty).flatMap((r) => rangeMarkers(view, r)),
  update: (update) => update.docChanged || update.selectionSet || update.viewportChanged,
})
