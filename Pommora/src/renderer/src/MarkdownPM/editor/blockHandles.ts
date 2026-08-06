// The block-drag rail handles: a grip on each draggable block's first line, content-anchored like the fold
// chevron (a `::before` on the line, so it can't drift below callouts/folds). Headings use the chevron,
// callouts keep their own grip, and the table widget supplies its own — the rail grip covers every other
// draggable kind (GRIP_KINDS; a list is grabbed at item 1, its block's first line).
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { docString } from './docCache'
import type { Extension, Range } from '@codemirror/state'
import { blockAt, blockStarts } from './blockModel'
import { lineElementAt } from './lineDom'

const GRIP_KINDS = new Set(['paragraph', 'code', 'list', 'hr', 'math', 'embed'])

// Blocks whose grip reveals on a gutter hover of ANY of their lines (the grip itself sits on the first line):
// GRIP_KINDS plus the box blocks that have a grip but aren't rail-pseudo grips. Tables are out — their rows
// carry their own handles.
const GRIP_BLOCKS = new Set([...GRIP_KINDS, 'callout', 'blockquote'])

// Blockquote can't use the rail `::before` grip — its quote bar is a `::before` and its fill an `::after`, both
// taken — so its grip is a real element (this widget), dropped into the same gutter by CSS. `side: -1` puts it
// before the line content; `ignoreEvent` false lets the press reach the md-bq-first drag gesture.
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
  for (const b of blockStarts(docString(state.doc))) {
    if (GRIP_KINDS.has(b.kind))
      ranges.push(Decoration.line({ class: 'md-block-handle' }).range(b.from))
    else if (b.kind === 'blockquote')
      ranges.push(Decoration.widget({ widget: gripWidget, side: -1 }).range(b.from))
  }
  return Decoration.set(ranges, true)
})

// Grips can't self-hover (a pseudo has no independent `:hover`, and a line's own `:hover` fires over its text
// too), so `md-grip-hot` is toggled here whenever the pointer sits in the gutter strip of ANY line within a
// grippable block — revealing the grip on that block's first line (paragraphs already behave this way, being a
// single doc line). `onHotChange` reports the HOVERED line, not the revealed one, so the host's hot-grip
// flag (the seam the right-click delete menu rides on) stays on the grip's own line, not anywhere in the box.
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
  // blockAt parses the doc, so resolve the block only when the hovered doc-line changes, not every pixel.
  let cachedFrom = -1
  let cachedFirstFrom = -1
  // Every line's left edge IS the content column's, so the gutter test needs one measurement rather
  // than a per-line rect. It leads the handler: past the column edge — the whole text area, and most
  // of the pointer's travel — the answer is no grip, reached without a hit-test or a parse.
  let textLeft = -1
  const columnLeft = (view: EditorView): number => {
    if (textLeft < 0) {
      const box = view.contentDOM.getBoundingClientRect()
      textLeft = box.left + parseFloat(getComputedStyle(view.contentDOM).paddingLeft || '0')
    }
    return textLeft
  }
  return [
    // The column moves only when the editor's own geometry does — never on scroll, a doc edit, or a
    // caret move, which is what makes one cached edge safe across a whole hover session.
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
          const block = blockAt(docString(view.state.doc), pos)
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
