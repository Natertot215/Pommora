// Owns where a block may land and what the move writes; `beginRelocateDrag` runs the gesture.
// `createBlockDragGesture` parameterizes only the hit-test class, so the rail grips, the heading
// chevron, the callout head, and the quote grip all share one gesture.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { blockAt, blockStarts } from './blockModel'
import { docScan, docString } from './docCache'
import { nearestBoundary, shadeField, type Boundary } from './dragChrome'
import { beginRelocateDrag, editorGestureCleanup } from './EditorGesture'
import { lineElementAt } from './lineDom'
import { blockMoveChanges } from './listDragModel'

// Outer bottom of the block above a gap (skipping blank lines), so the line sits outside a box
// (below a callout's border, not inside it).
function bottomAbove(view: EditorView, at: number): number | null {
  if (at === 0) return null
  let line = view.state.doc.lineAt(at - 1)
  while (line.from > 0 && line.length === 0) line = view.state.doc.lineAt(line.from - 1)
  return lineElementAt(view, line.from)?.getBoundingClientRect().bottom ?? null
}

// Each block outside the dragged one offers two boundaries (top, and content bottom via
// `bottomAbove`), so the line snaps to the nearer edge and flips at the block's midpoint. The
// dragged block's own two edges stay in the candidate set — hittable, but drawing no line, so a
// release there cancels in place.
type Cand = Boundary<{ left: number; right: number }>
interface BlockShape {
  starts: number[]
  docLength: number
  /** Dropping here, or at the block's own start, leaves the block where it already is. */
  afterBlock: number
}

function blockShape(view: EditorView, block: { from: number; to: number }): BlockShape {
  const scan = docScan(view.state.doc)
  const starts = blockStarts(scan).map((b) => b.from)
  const docLength = scan.text.length
  return {
    starts,
    docLength,
    afterBlock: starts.find((s) => s > block.to) ?? docLength,
  }
}

function collectCands(
  view: EditorView,
  block: { from: number; to: number },
  shape: BlockShape,
): Cand[] {
  const rect = view.contentDOM.getBoundingClientRect()
  const right = rect.right - (parseFloat(getComputedStyle(view.contentDOM).paddingRight) || 0)
  const { starts, docLength } = shape
  const out: Cand[] = []
  // Uses `view.viewport`, never `visibleRanges` — a block widget replacing its content puts a gap
  // in the visible ranges, which would lose the boundary above a table at the top of the document.
  const { from: top, to: bottom } = view.viewport
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]
    if (from < top || from > bottom) continue
    if (from >= block.from && from <= block.to) continue
    const c = view.coordsAtPos(from)
    if (!c) continue
    const topY = lineElementAt(view, from)?.getBoundingClientRect().top ?? c.top
    out.push({ at: from, y: topY, slot: { left: c.left, right } })
    const nextFrom = i + 1 < starts.length ? starts[i + 1] : docLength
    const botY = bottomAbove(view, nextFrom)
    if (botY !== null) out.push({ at: nextFrom, y: botY, slot: { left: c.left, right } })
  }
  return out.sort((a, b) => a.y - b.y)
}

// Exported so a non-CM-line handle (the table widget's action grip) can start a block drag from a
// block it resolved itself, without a gutter to hit-test.
export function startBlockDrag(
  view: EditorView,
  e: PointerEvent,
  block: { from: number; to: number },
  opts: {
    onClick?: (view: EditorView, line: HTMLElement) => void
    onDragStart?: (view: EditorView, block: { from: number; to: number }) => void
    line?: HTMLElement
  } = {},
): void {
  const { onClick, onDragStart, line } = opts
  if (e.button !== 0) return // a right-press falls through to the context menu
  e.preventDefault()
  const shape = blockShape(view, block)
  beginRelocateDrag(view, e, block, {
    measure: () => collectCands(view, block, shape),
    pick: nearestBoundary<Cand['slot']>,
    lineFor: ({ at, y, slot }) =>
      at === block.from || at === shape.afterBlock
        ? null
        : { left: slot.left, top: y, width: slot.right - slot.left },
    commit: ({ at }) => blockMoveChanges(docString(view.state.doc), block, { at }),
    onDragStart: () => onDragStart?.(view, block),
    onTap: line ? () => onClick?.(view, line) : undefined,
  })
}

interface DragConfig {
  gate: string // the cm-line class that arms the gesture, hit-tested in the gutter strip
  onClick?: (view: EditorView, line: HTMLElement) => void
  onDragStart?: (view: EditorView, block: { from: number; to: number }) => void
}

export function createBlockDragGesture({ gate, onClick, onDragStart }: DragConfig): Extension {
  const sel = `.cm-line.${gate}`
  return [
    shadeField,
    editorGestureCleanup,
    EditorView.domEventHandlers({
      // Suppress CM's text-selection drag when the press starts on a gutter handle.
      mousedown(e) {
        const line = (e.target as HTMLElement).closest?.(sel) as HTMLElement | null
        if (e.button === 0 && line && e.clientX < line.getBoundingClientRect().left) {
          e.preventDefault()
          return true
        }
        return false
      },
      pointerdown(e, view) {
        if (e.button !== 0) return false
        const line = (e.target as HTMLElement).closest?.(sel) as HTMLElement | null
        if (!line || e.clientX >= line.getBoundingClientRect().left) return false
        const block = blockAt(docScan(view.state.doc), view.posAtDOM(line))
        if (!block) return false
        startBlockDrag(view, e, block, { onClick, onDragStart, line })
        return true
      },
    }),
  ]
}

export const blockDragExtension: Extension = createBlockDragGesture({ gate: 'md-block-handle' })

// The callout's own gutter grip (its `::after`, on the head line) drags the whole box — `blockAt` resolves a
// callout to its full box, so the same gesture moves it. Gated on the callout head line instead of a rail handle.
export const calloutDragExtension: Extension = createBlockDragGesture({ gate: 'md-callout-first' })

// Blockquote's gutter grip is a widget (its pseudos are taken by the bar + fill), but the drag is the same
// gesture, gated on the quote's first line — `blockAt` resolves it to the full quote.
export const blockquoteDragExtension: Extension = createBlockDragGesture({ gate: 'md-bq-first' })
