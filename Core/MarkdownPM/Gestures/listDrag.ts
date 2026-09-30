import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { parseListMarkerPrefixed as parseListMarker, type MarkdownScope } from '../Engine/detect'
import { docScan, docString } from '../docCache'
import { inSealedLine } from '../Engine/docScan'
import { forEachLine, shadeField, type Boundary } from './dragChrome'
import { beginRelocateDrag, editorGestureCleanup } from './editorGesture'
import { lineElementAt } from '../lineDom'
import {
  subBlockAt,
  dropChanges,
  checkboxToggleChange,
  type SubBlock,
} from '../Engine/listDragModel'
import { GLYPH_CLASS } from '../Engine/intents'

// Measured at drag start and re-measured only on scroll: the doc is static during a drag, so re-measuring per pointermove would be layout thrash.
interface Drop {
  left: number
  right: number
  indent: string
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
function collectBoundaries(
  view: EditorView,
  block: SubBlock,
  scope: MarkdownScope,
): Boundary<Drop>[] {
  const doc = view.state.doc
  const contentRect = view.contentDOM.getBoundingClientRect()
  const padRight = parseFloat(getComputedStyle(view.contentDOM).paddingRight) || 0
  const gutterRight = contentRect.right - padRight
  const scan = docScan(doc)
  const out: Boundary<Drop>[] = []
  for (const { from, to } of view.visibleRanges) {
    forEachLine(doc, from, to, (line) => {
      const lm = parseListMarker(line.text)
      const inBlock = line.from >= block.from && line.from <= block.to
      // A marker-lookalike inside a page's code, math or table is that block's text, never a drop target; a cell draws none of the three.
      const sealed = scope === 'page' && inSealedLine(scan, line.number - 1)
      if (lm === null || inBlock || sealed) return
      const cTop = view.coordsAtPos(line.from)
      const cEnd = view.coordsAtPos(line.to)
      const cMarker = view.coordsAtPos(line.from + lm.markerStart)
      if (cTop && cEnd) {
        const slot = {
          left: (cMarker ?? cTop).left,
          right: lineRightEdge(view, line.from, gutterRight),
          indent: line.text.slice(0, lm.markerStart),
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

export const listDragExtension = (scope: MarkdownScope): Extension => [
  shadeField,
  editorGestureCleanup,
  EditorView.domEventHandlers({
    // CM starts its text-selection drag on mousedown, which still arrives when the pointerdown below resolves no block and returns without cancelling.
    mousedown(e) {
      if (e.button === 0 && (e.target as HTMLElement).closest?.(`.${GLYPH_CLASS}`)) {
        e.preventDefault()
        return true
      }
      return false
    },
    pointerdown(e, view) {
      if (e.button !== 0) return false
      const glyph = (e.target as HTMLElement).closest?.(`.${GLYPH_CLASS}`)
      if (!glyph) return false
      const pos = view.posAtDOM(glyph)
      const scan = docScan(view.state.doc)
      const block = subBlockAt(scan, pos)
      if (!block) return false

      e.preventDefault()

      beginRelocateDrag(view, e, block, {
        measure: () => collectBoundaries(view, block, scope),
        lineFor: ({ at, y, slot }) =>
          at >= block.from && at <= block.to + 1
            ? null
            : { left: slot.left, top: y, width: slot.right - slot.left },
        commit: ({ at, slot }) =>
          dropChanges(docString(view.state.doc), block, { at, indent: slot.indent }),
        onTap: () => clickAction(view, pos),
      })
      return true
    },
  }),
]
