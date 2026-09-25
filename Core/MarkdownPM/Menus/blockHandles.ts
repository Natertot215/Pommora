// Content-anchored like the fold chevron so a grip can't drift below callouts or folds. Headings use the chevron, callouts keep their own, and the table widget supplies its own.
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'
import { docScan } from '../docCache'
import type { Extension, Range } from '@codemirror/state'
import { blockAt, blockStarts } from '../Engine/blockModel'
import { GRIP_HOST } from '../Engine/intents'
import { lineElementAt } from '../lineDom'
import type { MarkdownScope } from '../Engine/detect'
import { REVEAL_REACH, type Reach, withinReach } from '@pommora/uix/Interactions/hoverReveal'

const GRIP_KINDS = new Set(['paragraph', 'code', 'list', 'hr', 'math', 'embed', 'webpage'])

const GRIP_BLOCKS = new Set([...GRIP_KINDS, 'callout', 'blockquote'])

// A cell speaks the list vocabulary alone, so a list is the only block there with anything for a grip to move or a menu to offer.
const CELL_KINDS = new Set(['list'])

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

export function blockHandles(scope: MarkdownScope = 'page'): Extension {
  const kinds = scope === 'cell' ? CELL_KINDS : GRIP_KINDS
  return EditorView.decorations.compute(['doc'], (state) => {
    const ranges: Range<Decoration>[] = []
    for (const b of blockStarts(docScan(state.doc))) {
      if (kinds.has(b.kind))
        ranges.push(
          Decoration.line({ class: 'md-block-handle', attributes: GRIP_HOST }).range(b.from),
        )
      else if (scope === 'page' && b.kind === 'blockquote')
        ranges.push(Decoration.widget({ widget: gripWidget, side: -1 }).range(b.from))
    }
    return Decoration.set(ranges, true)
  })
}

type Tag = { el: HTMLElement; box: DOMRect }
type TagMeasure = { font: number; tags: Tag[] }
const TAG_REACH: Reach = { size: 'inline', toward: { x: -1, y: 1 } }
// KNOB: the text size REVEAL_REACH's figures are tuned at; the reach grows with the page's font against it.
const REACH_BASE_PX = 15

class TagReveal {
  tags: Tag[] | null = null
  fontPx = 0
  readonly pointer = { x: 0, y: 0, inside: false }
  hot: HTMLElement | null = null
  readonly request: { read: () => TagMeasure; write: (m: TagMeasure) => void }

  constructor(readonly view: EditorView) {
    this.request = {
      read: () => ({
        font: parseFloat(getComputedStyle(view.contentDOM).fontSize),
        tags: Array.from(view.contentDOM.querySelectorAll<HTMLElement>('.codeblock-language'))
          .filter((el) => el.closest('.cm-content') === view.contentDOM)
          .map((el) => ({ el, box: el.getBoundingClientRect() })),
      }),
      write: (m) => {
        this.fontPx = m.font
        this.tags = m.tags
        this.test()
      },
    }
    view.contentDOM.addEventListener('pointermove', this.move)
    view.contentDOM.addEventListener('pointerleave', this.leave)
  }

  readonly move = (e: PointerEvent): void => {
    this.pointer.x = e.clientX
    this.pointer.y = e.clientY
    this.pointer.inside = true
    if (this.tags) this.test()
    else this.view.requestMeasure(this.request)
  }

  readonly leave = (): void => {
    this.pointer.inside = false
    this.tags = null
    this.show(null)
  }

  moved(): void {
    this.tags = null
    if (this.pointer.inside) this.view.requestMeasure(this.request)
  }

  update(u: ViewUpdate): void {
    if (u.docChanged || u.viewportChanged || u.geometryChanged || u.selectionSet || u.focusChanged)
      this.moved()
  }

  show(next: HTMLElement | null): void {
    if (next === this.hot) return
    if (this.hot) this.hot.dataset.revealHost = ''
    if (next) next.dataset.revealHost = 'on'
    this.hot = next
  }

  test(): void {
    const { tags, pointer } = this
    if (!tags || !pointer.inside) return
    const scale = this.fontPx / REACH_BASE_PX
    let lo = 0
    let hi = tags.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tags[mid].box.top <= pointer.y) lo = mid + 1
      else hi = mid
    }
    for (let i = lo - 1; i >= 0; i--) {
      const t = tags[i]
      if (withinReach(t.box, TAG_REACH, pointer.x, pointer.y, scale)) {
        this.show(t.el)
        return
      }
      if (pointer.y - t.box.bottom > REVEAL_REACH.inline * scale) break
    }
    this.show(null)
  }

  destroy(): void {
    this.view.contentDOM.removeEventListener('pointermove', this.move)
    this.view.contentDOM.removeEventListener('pointerleave', this.leave)
  }
}

// Grips can't self-hover, so a grippable block's first line is a script host, turned `on` whenever the pointer sits in the gutter strip of any of its lines. On a page each code tag reveals its copy mark while the pointer is within reach, scaled with the editor's font; that listener is the content's own, so a move over a table or an embed, which the editor's handlers skip, still counts.
export function pointerReveal(scope: MarkdownScope = 'page'): Extension {
  const blocks = scope === 'cell' ? CELL_KINDS : GRIP_BLOCKS
  let hotLine: HTMLElement | null = null
  const setHot = (next: HTMLElement | null): void => {
    if (next === hotLine && next?.dataset.revealHost !== 'off') return
    if (hotLine && hotLine !== next && hotLine.dataset.revealHost === 'on')
      hotLine.dataset.revealHost = 'off'
    if (next) next.dataset.revealHost = 'on'
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
    EditorView.updateListener.of((u) => {
      if (u.geometryChanged) textLeft = -1
      if (u.docChanged) cachedFrom = -1
      if (hotLine?.isConnected && hotLine.dataset.revealHost === 'off')
        hotLine.dataset.revealHost = 'on'
    }),
    ...(scope === 'cell'
      ? []
      : [
          ViewPlugin.define((view) => new TagReveal(view), {
            eventHandlers: {
              scroll() {
                this.moved()
              },
            },
          }),
        ]),
    EditorView.domEventHandlers({
      pointermove(e, view) {
        // A cell's grip lives inside the text column rather than left of it, so hovering the list at all is what reveals it — but the gate stays, as a DOM walk rather than a measurement, because posAtCoords below reads layout.
        const cheapMiss =
          scope === 'cell'
            ? !(e.target as HTMLElement).closest?.('.cm-line.md-list-item')
            : e.clientX >= columnLeft(view)
        if (cheapMiss) {
          setHot(null)
          return
        }
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
        if (pos == null) {
          setHot(null)
          return
        }
        const lineFrom = view.state.doc.lineAt(pos).from
        if (!lineElementAt(view, lineFrom)) {
          setHot(null)
          return
        }
        if (lineFrom !== cachedFrom) {
          cachedFrom = lineFrom
          const block = blockAt(docScan(view.state.doc), pos)
          cachedFirstFrom =
            block && blocks.has(block.kind) ? view.state.doc.lineAt(block.from).from : -1
        }
        setHot(cachedFirstFrom < 0 ? null : lineElementAt(view, cachedFirstFrom))
      },
      pointerleave() {
        setHot(null)
        textLeft = -1
      },
    }),
  ]
}
