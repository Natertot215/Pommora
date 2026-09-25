// Content-anchored like the fold chevron so a grip can't drift below callouts or folds. Headings use the chevron, callouts keep their own, and the table widget supplies its own.
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'
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

type Tag = { el: HTMLElement; left: number; top: number; right: number; bottom: number }
const TAG_REACH: Reach = { size: 'inline', toward: { x: -1, y: 1 } }

// Grips can't self-hover, so a grippable block's first line is a script host, turned `on` whenever the pointer sits in the gutter strip of any of its lines. On a page the code tags are hosts too: each reveals its copy mark while the pointer is within reach of it, scaled with the editor's font. `basePt` is the font size that reach is written for.
export function pointerReveal(scope: MarkdownScope = 'page', basePt?: number): Extension {
  const blocks = scope === 'cell' ? CELL_KINDS : GRIP_BLOCKS
  let hotLine: HTMLElement | null = null
  const setHot = (next: HTMLElement | null): void => {
    if (next === hotLine && next?.dataset.revealHost !== 'off') return
    if (hotLine && hotLine !== next) hotLine.dataset.revealHost = 'off'
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

  let tags: Tag[] | null = null
  let fontPx = 0
  let measuring = false
  const pointer = { x: 0, y: 0, inside: false }
  let hotTag: HTMLElement | null = null
  const setTag = (next: HTMLElement | null): void => {
    if (next === hotTag) return
    if (hotTag) hotTag.dataset.revealHost = ''
    if (next) next.dataset.revealHost = 'on'
    hotTag = next
  }
  const testTags = (): void => {
    if (!tags || !pointer.inside || basePt === undefined) return
    const { x, y } = pointer
    const scale = fontPx / basePt
    let lo = 0
    let hi = tags.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tags[mid].top <= y) lo = mid + 1
      else hi = mid
    }
    for (let i = lo - 1; i >= 0; i--) {
      const t = tags[i]
      if (withinReach(t, TAG_REACH, x, y, scale)) {
        setTag(t.el)
        return
      }
      if (y - t.bottom > REVEAL_REACH.inline * scale) break
    }
    setTag(null)
  }
  const dirty = (): void => {
    tags = null
  }
  const measure = (view: EditorView): void => {
    if (measuring) return
    measuring = true
    view.requestMeasure({
      read: () => ({
        font: parseFloat(getComputedStyle(view.contentDOM).fontSize),
        boxes: Array.from(view.contentDOM.querySelectorAll<HTMLElement>('.codeblock-language'))
          .filter((el) => el.closest('.cm-content') === view.contentDOM)
          .map((el) => {
            const r = el.getBoundingClientRect()
            return { el, left: r.left, top: r.top, right: r.right, bottom: r.bottom }
          }),
      }),
      write: (m) => {
        measuring = false
        fontPx = m.font
        tags = m.boxes
        testTags()
      },
    })
  }
  const code = basePt !== undefined

  return [
    EditorView.updateListener.of((u) => {
      if (u.geometryChanged) textLeft = -1
      if (
        code &&
        (u.docChanged || u.viewportChanged || u.geometryChanged || u.selectionSet || u.focusChanged)
      )
        dirty()
      if (hotLine?.isConnected && hotLine.dataset.revealHost !== 'on')
        hotLine.dataset.revealHost = 'on'
    }),
    ...(code
      ? [
          ViewPlugin.define(() => {
            window.addEventListener('scroll', dirty, { capture: true, passive: true })
            return { destroy: () => window.removeEventListener('scroll', dirty, { capture: true }) }
          }),
        ]
      : []),
    EditorView.domEventHandlers({
      scroll: dirty,
      pointermove(e, view) {
        if (code) {
          pointer.x = e.clientX
          pointer.y = e.clientY
          pointer.inside = true
          if (tags) testTags()
          else measure(view)
        }
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
        pointer.inside = false
        dirty()
        setTag(null)
      },
    }),
  ]
}
