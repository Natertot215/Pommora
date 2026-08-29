// Drag-to-reorder list items by their `.md-li-glyph`: a press past the ACTIVATION threshold becomes a drag, a
// release-in-place is a click (checkbox → toggle, else caret). The drop moves the source lines (block + nested
// descendants) in one transaction, renumbering any ordered run it touched.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { parseListMarkerPrefixed as parseListMarker } from '../Detect'
import { docScan, docString } from './docCache'
import { forEachLine, nearestBoundary, shadeField, type Boundary } from './dragChrome'
import { beginRelocateDrag, editorGestureCleanup } from './EditorGesture'
import { focusAt } from './caretSeat'
import { lineElementAt } from './lineDom'
import {
  subBlockAt,
  dropChanges,
  checkboxToggleChange,
  type SubBlock,
  type Slot,
} from './listDragModel'

interface ResolvedSlot extends Slot {
  lineLeft: number // viewport x of the insertion line's left edge
  lineTop: number // viewport y
  lineWidth: number
  indent: string // depth the dropped block adopts — the target line's leading whitespace
}

// A drop candidate — a visible list line outside the dragged block, measured in viewport coords at drag
// start and re-measured only on scroll (wheel or the auto-scroll loop): the doc is static during a drag,
// so re-measuring per pointermove would be pure layout thrash.
interface Cand {
  from: number
  to: number
  top: number // viewport y of the line top
  bottom: number // viewport y of the line bottom
  left: number // viewport x of the marker — the line's left follows the item's indent
  right: number // viewport x of the right gutter (wrap boundary) — the line spans the writing column
  indent: string // the line's leading whitespace — the dropped block adopts this depth
}

// The right edge a drop line reaches on a given line: the page wrap boundary, except inside a box (callout /
// quote), where it's that line's own content-box right — read from the rendered element so the callout's CSS
// padding owns the width (no recomputing the inset here).
function lineRightEdge(view: EditorView, from: number, fallback: number): number {
  const n = lineElementAt(view, from)
  if (!n || (!n.classList.contains('md-callout') && !n.classList.contains('md-bq'))) return fallback
  const cs = getComputedStyle(n)
  return (
    n.getBoundingClientRect().right -
    parseFloat(cs.paddingRight || '0') -
    parseFloat(cs.borderRightWidth || '0')
  )
}

function collectCands(view: EditorView, block: SubBlock): Cand[] {
  const doc = view.state.doc
  const contentRect = view.contentDOM.getBoundingClientRect()
  const padRight = parseFloat(getComputedStyle(view.contentDOM).paddingRight) || 0
  const gutterRight = contentRect.right - padRight // the wrap boundary — the line spans out to here
  // A marker-lookalike inside display math is formula source, never a drop target.
  const maths = docScan(doc).maths
  const out: Cand[] = []
  for (const { from, to } of view.visibleRanges) {
    forEachLine(doc, from, to, (line) => {
      const lm = parseListMarker(line.text)
      const inBlock = line.from >= block.from && line.from <= block.to
      if (lm === null || inBlock) return
      if (maths.some(([f, t]) => line.from >= f && line.from <= t)) return
      const cTop = view.coordsAtPos(line.from)
      const cEnd = view.coordsAtPos(line.to)
      const cMarker = view.coordsAtPos(line.from + lm.markerStart)
      if (cTop && cEnd) {
        out.push({
          from: line.from,
          to: line.to,
          top: cTop.top,
          bottom: cEnd.bottom,
          left: (cMarker ?? cTop).left,
          right: lineRightEdge(view, line.from, gutterRight),
          indent: line.text.slice(0, lm.markerStart),
        })
      }
    })
  }
  out.sort((a, b) => a.top - b.top)
  return out
}

// Cheap per-move hit-test against the cached candidates — all viewport coords (matching the pointer's
// clientY and the position:fixed line). Each candidate offers two insertion boundaries, before it and
// after it, so a paragraph between two bullets splits to the nearer bullet's edge instead of one
// bullet owning the whole gap.
function slotFrom(
  cands: Cand[],
  clientY: number,
  block: SubBlock,
  docLen: number,
): ResolvedSlot | null {
  const bs: Boundary<Cand>[] = []
  for (const c of cands) {
    bs.push({ at: c.from, y: c.top, slot: c })
    bs.push({ at: c.to < docLen ? c.to + 1 : docLen, y: c.bottom, slot: c })
  }
  const best = nearestBoundary(bs, clientY)
  if (best === null) return null
  if (best.at >= block.from && best.at <= block.to + 1) return null // landing inside the dragged block → no slot
  return {
    at: best.at,
    lineLeft: best.slot.left,
    lineTop: best.y,
    lineWidth: best.slot.right - best.slot.left,
    indent: best.slot.indent,
  }
}

// A glyph CLICK (press released without crossing ACTIVATION): checkbox → toggle; bullet / number → caret.
function clickAction(view: EditorView, pos: number): void {
  const toggle = checkboxToggleChange(docString(view.state.doc), pos)
  if (toggle) {
    view.dispatch({ changes: toggle, userEvent: 'input' })
    return
  }
  focusAt(view, pos)
}

export const listDragExtension: Extension = [
  shadeField,
  editorGestureCleanup,
  EditorView.domEventHandlers({
    // CM starts its text-selection drag on mousedown, and preventDefault on pointerdown doesn't cancel the
    // compatibility mousedown — so without this, pressing a glyph to drag would also select text under it.
    mousedown(e) {
      if (e.button === 0 && (e.target as HTMLElement).closest?.('.md-li-glyph')) {
        e.preventDefault()
        return true
      }
      return false
    },
    pointerdown(e, view) {
      if (e.button !== 0) return false
      const glyph = (e.target as HTMLElement).closest?.('.md-li-glyph')
      if (!glyph) return false
      const pos = view.posAtDOM(glyph)
      const doc = docString(view.state.doc)
      const block = subBlockAt(doc, pos)
      if (!block) return false

      e.preventDefault() // suppress text-selection / caret on the glyph press (numbers are source text)

      beginRelocateDrag(view, e, block, {
        measure: () => collectCands(view, block),
        pick: (cands, clientY) => slotFrom(cands, clientY, block, view.state.doc.length),
        lineFor: (slot) => ({ left: slot.lineLeft, top: slot.lineTop, width: slot.lineWidth }),
        commit: (slot) => dropChanges(docString(view.state.doc), block, slot),
        onTap: () => clickAction(view, pos),
      })
      return true
    },
  }),
]
