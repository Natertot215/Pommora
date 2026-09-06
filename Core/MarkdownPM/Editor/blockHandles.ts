// A grip on each draggable block's first line, content-anchored like the fold chevron (a
// `::before` on the line, so it can't drift below callouts/folds). Headings use the chevron,
// callouts keep their own grip, and the table widget supplies its own — the rail grip covers
// every other draggable kind (a list is grabbed at item 1, its block's first line).
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { docScan } from './docCache'
import type { Extension, Range } from '@codemirror/state'
import { blockAt, blockStarts } from './blockModel'
import { lineElementAt } from './lineDom'

const GRIP_KINDS = new Set(['paragraph', 'code', 'list', 'hr', 'math', 'embed', 'webpage'])

// Blocks whose grip reveals on a gutter hover of any of their lines. Tables are out — their rows
// carry their own handles.
const GRIP_BLOCKS = new Set([...GRIP_KINDS, 'callout', 'blockquote'])

// Blockquote can't use the rail `::before` grip — its quote bar is a `::before` and its fill an
// `::after`, both taken — so its grip is a real element, dropped into the gutter by CSS. `side: -1`
// puts it before the line content; `ignoreEvent` false lets the press reach the drag gesture.
class GripWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-bq-grip'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
  ignoreEvent(): boolean {
    return false
  }
}
const gripWidget = new GripWidget()

export const blockHandles = EditorView.decorations.compute(['doc'], (state) => {
  const ranges: Range<Decoration>[] = []
  for (const b of blockStarts(docScan(state.doc))) {
    if (GRIP_KINDS.has(b.kind))
      ranges.push(Decoration.line({ class: 'md-block-handle' }).range(b.from))
    else if (b.kind === 'blockquote')
      ranges.push(Decoration.widget({ widget: gripWidget, side: -1 }).range(b.from))
  }
  return Decoration.set(ranges, true)
})

// Grips can't self-hover (a pseudo has no independent `:hover`), so `md-grip-hot` is toggled here
// whenever the pointer sits in the gutter strip of any line within a grippable block — revealing
// the grip on that block's first line. `onHotChange` reports the hovered line, not the revealed
// one — the host's hot-grip flag (the right-click delete menu's seam) needs the grip's own line.
export function blockGripHover(onHotChange?: (line: HTMLElement | null) => void): Extension {
  let hotLine: HTMLElement | null = null
  const setHot = (next: HTMLElement | null): void => {
    if (next === hotLine) return
    hotLine?.classList.remove('md-grip-hot')
    next?.classList.add('md-grip-hot')
    hotLine = next
  }
  let reported: HTMLElement | null = null
  const report = (line: HTMLElement | null): void => {
    if (line === reported) return
    reported = line
    onHotChange?.(line)
  }
  // blockAt parses the doc, so resolve the block only when the hovered doc-line changes.
  let cachedFrom = -1
  let cachedFirstFrom = -1
  // Every line's left edge is the content column's, so one measurement covers the gutter test.
  // Checked first: past the column edge, no grip is reached without a hit-test or parse.
  let textLeft = -1
  const columnLeft = (view: EditorView): number => {
    if (textLeft < 0) {
      const box = view.contentDOM.getBoundingClientRect()
      textLeft = box.left + parseFloat(getComputedStyle(view.contentDOM).paddingLeft || '0')
    }
    return textLeft
  }
  return [
    // The column moves only when the editor's own geometry does, so one cached edge is safe across
    // a whole hover session.
    EditorView.updateListener.of((u) => {
      if (u.geometryChanged) textLeft = -1
    }),
    EditorView.domEventHandlers({
      mousemove(e, view) {
        if (e.clientX >= columnLeft(view)) {
          setHot(null)
          report(null)
          return
        }
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
        const lineFrom = pos == null ? null : view.state.doc.lineAt(pos).from
        const hovered = lineFrom == null ? null : lineElementAt(view, lineFrom)
        if (pos == null || lineFrom == null || !hovered) {
          setHot(null)
          report(null)
          return
        }
        if (lineFrom !== cachedFrom) {
          cachedFrom = lineFrom
          const block = blockAt(docScan(view.state.doc), pos)
          cachedFirstFrom =
            block && GRIP_BLOCKS.has(block.kind) ? view.state.doc.lineAt(block.from).from : -1
        }
        setHot(cachedFirstFrom < 0 ? null : lineElementAt(view, cachedFirstFrom))
        report(hovered)
      },
      mouseleave() {
        setHot(null)
        report(null)
      },
    }),
  ]
}
