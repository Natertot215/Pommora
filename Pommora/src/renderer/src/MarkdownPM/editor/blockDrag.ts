// Block drag: press a block's gutter handle → drag the whole block → drop it at the nearest block boundary.
// This file owns where a block may land and what the move writes; `beginRelocateDrag` runs the gesture around
// it. `createBlockDragGesture` parameterizes only the hit-test class, so the rail grips, the heading chevron,
// the callout head, and the quote grip all share ONE gesture.
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { blockAt, blockStarts } from './blockModel'
import { shadeField } from './dragChrome'
import { beginRelocateDrag, editorGestureCleanup } from './EditorGesture'
import { lineElementAt } from './lineDom'
import { blockMoveChanges } from './listDragModel'

// The OUTER bottom of the content block above a gap (skipping blank lines), so the insertion line reads "the
// dragged block goes BELOW this" and sits OUTSIDE a box (below a callout's border, not inside it).
function bottomAbove(view: EditorView, at: number): number | null {
  if (at === 0) return null
  let line = view.state.doc.lineAt(at - 1)
  while (line.from > 0 && line.length === 0) line = view.state.doc.lineAt(line.from - 1)
  return lineElementAt(view, line.from)?.getBoundingClientRect().bottom ?? null
}

// Drop candidates, list-drag-style: each block outside the dragged one offers TWO boundaries — above it (its
// top) and below it (its content bottom, see `bottomAbove`) — so the insertion line snaps to the nearer block
// edge and flips at the block's midpoint. Measured in viewport coords; folded/off-screen blocks are skipped.
interface Cand {
  at: number
  y: number
  left: number
  right: number
  noop: boolean // the "stay put" slot (a drop here moves nothing) — hittable so release-in-place cancels, but draws no line
}
function collectCands(view: EditorView, block: { from: number; to: number }): Cand[] {
  const doc = view.state.doc.toString()
  const rect = view.contentDOM.getBoundingClientRect()
  const right = rect.right - (parseFloat(getComputedStyle(view.contentDOM).paddingRight) || 0)
  const starts = blockStarts(doc).map((b) => b.from)
  const afterBlock = starts.find((s) => s > block.to) ?? doc.length // the boundary just past the dragged block
  const isNoop = (at: number): boolean => at === block.from || at === afterBlock // dropping there leaves the block put
  const out: Cand[] = []
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]
    if (from >= block.from && from <= block.to) continue // inside the dragged block
    const c = view.coordsAtPos(from)
    if (!c) continue // folded away or off-screen → auto-scroll brings scrollable ones in
    const topY = lineElementAt(view, from)?.getBoundingClientRect().top ?? c.top // OUTER top (above a box's border)
    out.push({ at: from, y: topY, left: c.left, right, noop: isNoop(from) }) // ABOVE this block
    const nextFrom = i + 1 < starts.length ? starts[i + 1] : doc.length
    const botY = bottomAbove(view, nextFrom) // this block's OUTER bottom (below a box's border)
    if (botY !== null)
      out.push({ at: nextFrom, y: botY, left: c.left, right, noop: isNoop(nextFrom) }) // BELOW this block
  }
  return out.sort((a, b) => a.y - b.y)
}

function nearest(cands: Cand[], clientY: number): Cand | null {
  let best: Cand | null = null
  let bd = Infinity
  for (const c of cands) {
    const d = Math.abs(clientY - c.y)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

// Exported so a non-CM-line handle — the table widget's action grip — can start a block drag from a block it
// resolved itself, without a gutter to hit-test.
export function startBlockDrag(
  view: EditorView,
  e: PointerEvent,
  block: { from: number; to: number },
  opts: {
    onClick?: (view: EditorView, line: HTMLElement) => void // sub-threshold release action (e.g. a heading's fold)
    onDragStart?: (view: EditorView, block: { from: number; to: number }) => void // at activation (e.g. unfold)
    line?: HTMLElement // the handle line (for onClick) — absent for the programmatic table grip
  } = {},
): void {
  const { onClick, onDragStart, line } = opts
  if (e.button !== 0) return // only the left button drags; a right-press falls through to the context menu (e.g. the table grip's Delete Table)
  e.preventDefault()
  beginRelocateDrag(view, e, block, {
    measure: () => collectCands(view, block),
    pick: nearest,
    lineFor: (slot) =>
      slot.noop ? null : { left: slot.left, top: slot.y, width: slot.right - slot.left },
    commit: (slot) => blockMoveChanges(view.state.doc.toString(), block, { at: slot.at }),
    onDragStart: () => onDragStart?.(view, block),
    onTap: line ? () => onClick?.(view, line) : undefined,
  })
}

interface DragConfig {
  gate: string // the cm-line class that arms the gesture (hit-tested in the gutter strip left of the content)
  onClick?: (view: EditorView, line: HTMLElement) => void // sub-threshold release action (e.g. a heading's fold)
  onDragStart?: (view: EditorView, block: { from: number; to: number }) => void // at activation (e.g. unfold)
}

// The CM-line gesture: hit-test the gutter handle (`gate` + clientX), resolve the block via `blockAt`, then hand
// off to `startBlockDrag`. Shared by the rail grips, the heading chevron, and the callout head.
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
        if (!line || e.clientX >= line.getBoundingClientRect().left) return false // not the handle zone
        const block = blockAt(view.state.doc.toString(), view.posAtDOM(line))
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
