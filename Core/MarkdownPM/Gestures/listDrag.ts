import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { BlockSpan } from '../Engine/detect'
import { docScan, docString } from '../docCache'
import { markerIn } from '../Engine/docScan'
import { forEachLine, shadeField, type Boundary } from './dragChrome'
import { beginRelocateDrag, editorGestureCleanup } from './editorGesture'
import { glyphAt, lineElementAt, textColumn } from '../lineDom'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { subBlockAt, dropChanges, checkboxToggleChange } from '../Engine/listModel'

// Measured at drag start and re-measured only on scroll: the doc is static during a drag, so re-measuring per pointermove would be layout thrash.
interface Drop {
  left: number
  right: number
  indent: string
  line: number
}

// The page wrap boundary, except inside a box, where it is that line's own content-box right — read from the rendered element so the callout's CSS padding owns the width.
function lineRightEdge(view: EditorView, from: number, fallback: number): number {
  const n = lineElementAt(view, from)
  if (!n || (!n.classList.contains('md-callout') && !n.classList.contains('md-blockquote')))
    return fallback
  const cs = getComputedStyle(n)
  return (
    n.getBoundingClientRect().right -
    parseFloat(cs.paddingRight || '0') -
    parseFloat(cs.borderRightWidth || '0')
  )
}

// Each list line offers two insertion boundaries, so a paragraph between two bullets splits to the nearer edge.
function collectBoundaries(view: EditorView, block: BlockSpan): Boundary<Drop>[] {
  const doc = view.state.doc
  const gutterRight = textColumn(view).right
  const scan = docScan(view.state)
  const out: Boundary<Drop>[] = []
  const region = scan.fences[doc.lineAt(block.from).number - 1]?.from
  for (const { from, to } of view.visibleRanges) {
    forEachLine(doc, from, to, (line) => {
      const k = line.number - 1
      const lm = markerIn(scan, k, region)
      if (lm === null || (line.from >= block.from && line.from <= block.to)) return
      const cTop = view.coordsAtPos(line.from)
      const cEnd = view.coordsAtPos(line.to)
      const cMarker = view.coordsAtPos(line.from + lm.markerStart)
      if (cTop && cEnd) {
        const slot = {
          left: (cMarker ?? cTop).left,
          right: lineRightEdge(view, line.from, gutterRight),
          indent: line.text.slice(0, lm.markerStart),
          line: k,
        }
        out.push({ at: line.from, y: cTop.top, slot })
        out.push({ at: line.to < doc.length ? line.to + 1 : doc.length, y: cEnd.bottom, slot })
      }
    })
  }
  return out
}

function clickAction(view: EditorView, pos: number): void {
  const toggle = checkboxToggleChange(docString(view.state.doc), pos)
  if (toggle) {
    view.dispatch({ changes: toggle, userEvent: 'input' })
    return
  }
  view.dispatch({ selection: { anchor: pos }, userEvent: 'select.pointer' })
  view.focus()
}

export const listDragExtension: Extension = [
  shadeField,
  editorGestureCleanup,
  EditorView.domEventHandlers({
    // A glyph owns every press on it: a primary press is the drag below, and a secondary one, a right press or a Mac Ctrl-click, only opens the type menu. Neither seats the caret or starts CM's text-selection drag, which mousedown still starts when the pointerdown resolves no block.
    mousedown(e) {
      if ((e.button !== 0 && e.button !== 2) || !glyphAt(e)) return false
      e.preventDefault()
      return true
    },
    pointerdown(e, view) {
      if (e.button !== 0 || isSecondaryClick(e)) return false
      const glyph = glyphAt(e)
      if (!glyph) return false
      const pos = view.posAtDOM(glyph)
      const scan = docScan(view.state)
      const block = subBlockAt(scan, pos)
      if (!block) return false

      e.preventDefault()

      beginRelocateDrag(view, e, block, {
        measure: () => collectBoundaries(view, block),
        lineFor: ({ at, y, slot }) =>
          at >= block.from && at <= block.to + 1
            ? null
            : { left: slot.left, top: y, width: slot.right - slot.left },
        commit: ({ at, slot }) =>
          dropChanges(docScan(view.state), block, { at, indent: slot.indent, line: slot.line }),
        onTap: () => clickAction(view, pos),
      })
      return true
    },
  }),
]
