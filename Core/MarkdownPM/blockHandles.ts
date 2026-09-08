// Content-anchored like the fold chevron so a grip can't drift below callouts or folds. Headings use the chevron, callouts keep their own, and the table widget supplies its own.
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { docScan } from './docCache'
import type { Extension, Range } from '@codemirror/state'
import { blockAt, blockStarts } from './Engine/blockModel'
import { lineElementAt } from './lineDom'

const GRIP_KINDS = new Set(['paragraph', 'code', 'list', 'hr', 'math', 'embed', 'webpage'])

const GRIP_BLOCKS = new Set([...GRIP_KINDS, 'callout', 'blockquote'])

// Blockquote can't use the rail `::before` grip (its bar and fill take both pseudos), so its grip is a real element.
class GripWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-blockquote-grip'
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

// Grips can't self-hover, so `md-grip-hot` is toggled here whenever the pointer sits in the gutter strip of any line in a grippable block.
export function blockGripHover(): Extension {
  let hotLine: HTMLElement | null = null
  const setHot = (next: HTMLElement | null): void => {
    if (next === hotLine) return
    hotLine?.classList.remove('md-grip-hot')
    next?.classList.add('md-grip-hot')
    hotLine = next
  }
  // blockAt parses the doc, so resolve the block only when the hovered doc-line changes.
  let cachedFrom = -1
  let cachedFirstFrom = -1
  // Every line's left edge is the content column's, so one measurement covers the gutter test, checked before any parse.
  let textLeft = -1
  const columnLeft = (view: EditorView): number => {
    if (textLeft < 0) {
      const box = view.contentDOM.getBoundingClientRect()
      textLeft = box.left + parseFloat(getComputedStyle(view.contentDOM).paddingLeft || '0')
    }
    return textLeft
  }
  return [
    // The column moves only when the editor's geometry does, so one cached edge is safe across a hover session.
    EditorView.updateListener.of((u) => {
      if (u.geometryChanged) textLeft = -1
    }),
    EditorView.domEventHandlers({
      mousemove(e, view) {
        if (e.clientX >= columnLeft(view)) {
          setHot(null)
          return
        }
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
        const lineFrom = pos == null ? null : view.state.doc.lineAt(pos).from
        const hovered = lineFrom == null ? null : lineElementAt(view, lineFrom)
        if (pos == null || lineFrom == null || !hovered) {
          setHot(null)
          return
        }
        if (lineFrom !== cachedFrom) {
          cachedFrom = lineFrom
          const block = blockAt(docScan(view.state.doc), pos)
          cachedFirstFrom =
            block && GRIP_BLOCKS.has(block.kind) ? view.state.doc.lineAt(block.from).from : -1
        }
        setHot(cachedFirstFrom < 0 ? null : lineElementAt(view, cachedFirstFrom))
      },
      mouseleave() {
        setHot(null)
      },
    }),
  ]
}
