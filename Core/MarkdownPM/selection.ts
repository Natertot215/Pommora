// Seated BELOW the text so the tint sits behind the glyphs. Geometry only — fill, corner and bleed are the kit's caret.css.
import { EditorView, layer, RectangleMarker } from '@codemirror/view'
import type { SelectionRange } from '@codemirror/state'
import { selCorner } from '@pommora/uix/Theme/nativeCaret'
import { cx } from '@pommora/uix/Utilities/cx'
import { clampToLine, cursorMarkers } from './caret'
import { codeClip } from './codeScroll'

const CLS = 'sel-pill'

function caretEdge(view: EditorView, pos: number, assoc: 1 | -1): RectangleMarker | undefined {
  const [m] = cursorMarkers(view, CLS, pos, assoc)
  return m && clampToLine(view, CLS, m)
}

// CM hands back a contiguous, already-viewport-clipped ribbon, so only the OUTER bound is line-box tall where the caret is shorter; an edge the viewport clipped is a continuation and keeps its own box.
function rangeMarkers(view: EditorView, range: SelectionRange): RectangleMarker[] {
  const pieces = RectangleMarker.forRange(view, CLS, range)
  const last = pieces.length - 1
  const head = range.from >= view.viewport.from ? caretEdge(view, range.from, 1) : undefined
  const foot = range.to <= view.viewport.to ? caretEdge(view, range.to, -1) : undefined
  // An end inside a code block's run clips to what the run shows: the head on both sides, the foot on its right, and a foot whose glyph is scrolled out draws nothing.
  const headClip = codeClip(view, range.from)
  const footClip = codeClip(view, range.to)
  const drawn = pieces.flatMap((m, i) => {
    let left = m.left
    let right = m.left + m.width!
    if (i === 0 && headClip) {
      left = Math.max(left, headClip.left)
      right = Math.min(right, headClip.right)
    }
    if (i === last && footClip)
      right = right <= footClip.left ? left : Math.min(right, footClip.right)
    if (right < left || (right === left && m.width! > 0)) return []
    const top = i === 0 && head ? head.top : m.top
    const bottom = i === last && foot ? foot.top + foot.height : m.top + m.height
    return [{ left, right, top, bottom }]
  })
  return drawn.map(
    (p, i) =>
      new RectangleMarker(
        cx(CLS, selCorner(i, drawn.length)),
        p.left,
        p.top,
        p.right - p.left,
        Math.max(p.bottom - p.top, 1),
      ),
  )
}

export const customSelection = [
  layer({
    above: false,
    class: 'mdpm-sel-layer',
    markers: (view) =>
      view.state.selection.ranges.filter((r) => !r.empty).flatMap((r) => rangeMarkers(view, r)),
    update: (update) => update.docChanged || update.selectionSet || update.viewportChanged,
  }),
  EditorView.editorAttributes.of({ class: 'mdpm-drawn-selection' }),
]
