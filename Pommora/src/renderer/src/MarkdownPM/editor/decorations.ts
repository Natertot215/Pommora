// A ViewPlugin is valid because replaces never cross a line break (block-spanning chrome would need a StateField).
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import type { Extension, Range } from '@codemirror/state'
import { chipBoxGeometry } from '../../design-system/tokens'
import { tokenize, activeTokenIndices, linkTarget, shiftToken, type Token } from '../tokens'
import { docLineIntentsOf, docScan, docSpanTokens, docString } from './docCache'
import { claimedEmbeds } from './embedRanges'
import { resolutionNudge } from './embedWidget'
import { linkRest, linkTyping } from './linkGestures'
import {
  assembleLineIntents,
  type DocScan,
  GLYPH_CLASS,
  NO_CARET,
  tokenIntents,
  type WidgetSpec,
} from '../decorations/intent'
import { resolveMdTarget, type ConnectionsApi } from '../connections'

class HrWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-hr'
    return el
  }
}

// In-flow, replacing the marker slot through its gap — the visible spacing is the glyph's own margin.
class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = `md-bullet ${GLYPH_CLASS}`
    el.textContent = '•'
    return el
  }
  // WidgetType.ignoreEvent defaults to true — CM would swallow every event from this DOM, so the listDrag
  // pointerdown never fires on a bullet glyph. The checkbox widget overrides it for the same reason.
  ignoreEvent(): boolean {
    return false
  }
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly bracketFrom: number,
    readonly checked: boolean,
  ) {
    super()
  }
  eq(o: CheckboxWidget): boolean {
    return o.checked === this.checked && o.bracketFrom === this.bracketFrom
  }
  toDOM(): HTMLElement {
    // Toggle-on-click + drag-on-hold are both owned by the listDrag extension via the shared glyph class —
    // this widget only renders. Keeping the press handler here would flip the box on a press-to-drag.
    const zone = document.createElement('span')
    zone.className = `md-li-marker ${GLYPH_CLASS}`
    const box = document.createElement('span')
    box.className = `${chipBoxGeometry} md-checkbox${this.checked ? ' md-checkbox-checked' : ''}`
    if (this.checked) {
      box.innerHTML =
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
    }
    zone.appendChild(box)
    return zone
  }
  ignoreEvent(): boolean {
    return false
  }
}

// A non-replacing element pinned at a line's start (side -1) — e.g. the nested-quote bar, which must be a real
// element to sit OVER the fill with its own rounded caps. Positioned + shaped entirely in CSS by its class.
class LineWidget extends WidgetType {
  constructor(
    readonly className: string,
    readonly text?: string,
  ) {
    super()
  }
  eq(o: LineWidget): boolean {
    return o.className === this.className && o.text === this.text
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = this.className
    el.setAttribute('aria-hidden', 'true')
    if (this.text !== undefined) el.textContent = this.text
    return el
  }
}

// One outliner rail: an ancestor-level vertical guide, pinned at the line start (side -1) and positioned +
// shaped entirely in CSS from --rail-level (its ancestor column) plus the type class (glyph-centre offset).
// first/last carry the run-end caps, so a rail only rounds where its run actually begins/ends.
class OutlinerRailWidget extends WidgetType {
  constructor(
    readonly level: number,
    readonly typeClass: string,
    readonly first: boolean,
    readonly last: boolean,
  ) {
    super()
  }
  eq(o: OutlinerRailWidget): boolean {
    return (
      o.level === this.level &&
      o.typeClass === this.typeClass &&
      o.first === this.first &&
      o.last === this.last
    )
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = `md-outliner-rail ${this.typeClass}${this.first ? ' md-outliner-first' : ''}${this.last ? ' md-outliner-last' : ''}`
    el.style.setProperty('--rail-level', String(this.level))
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}

function widgetFor(spec: WidgetSpec): WidgetType {
  switch (spec.type) {
    case 'hr':
      return new HrWidget()
    case 'bullet':
      return new BulletWidget()
    case 'checkbox':
      return new CheckboxWidget(spec.bracketFrom, spec.checked)
  }
}

const hideMarker = Decoration.replace({})
const NO_ACTIVE = new Set<number>()

const INDENTED = /^[ \t]/

/** A slice carries no memory of the lines above it, so it opens on a line whose block context is
 *  self-evident. Resuming inside a fence would read that fence's closer as an opener and invert the
 *  parity of every line below it; opening on a bare indented line reads the indent as an indented code
 *  block, which swallows the emphasis its owning list line would have licensed. */
export function sliceStartLine(scan: DocScan, line: number): number {
  let i = line
  while (i < scan.lines.length && scan.fences[i] && scan.fences[i]?.role !== 'open') i++
  while (i > 0 && INDENTED.test(scan.lines[i]) && !scan.fences[i - 1]) i--
  return i
}

// Tokenize only the on-screen lines, not the whole document — the heavy mdast parse + global-regex
// passes over the whole document are what made long docs lag and the caret jitter. Tokens are shifted
// back to absolute offsets; the slice's own fence model suppresses what falls inside a code block.
// Paired with a rebuild on `viewportChanged` (scroll), and memoized so only a doc edit or a moved
// viewport pays the parse.
function visibleInlineTokens(view: EditorView, text: string, scan: DocScan): Token[] {
  const doc = view.state.doc
  const spans: [number, number][] = []
  for (const { from, to } of view.visibleRanges) {
    const a = scan.lineStarts[sliceStartLine(scan, doc.lineAt(from).number - 1)]
    const b = doc.lineAt(to).to
    if (a >= b) continue
    const prev = spans[spans.length - 1]
    if (prev && a <= prev[1] + 1) prev[1] = Math.max(prev[1], b)
    else spans.push([a, b])
  }
  const key = spans.map(([a, b]) => `${a}:${b}`).join(',')
  return docSpanTokens(doc, key, () => {
    const out: Token[] = []
    for (const [a, b] of spans) {
      for (const tk of tokenize(text.slice(a, b))) out.push(shiftToken(tk, a))
    }
    return out
  })
}

function build(view: EditorView, conn: ConnectionsApi | undefined): DecorationSet {
  const text = docString(view.state.doc)
  // The whole-doc scan, the caret-free line intents, AND the viewport tokenize are each one derivation
  // per doc VERSION (docCache) — a caret move or focus flip re-derives only the caret's own affected
  // lines, never an O(doc) line walk and never the parse.
  const scan = docScan(view.state.doc)
  const focused = view.hasFocus
  const sel = view.state.selection.main
  let tokens = visibleInlineTokens(view, text, scan)
  // A CLAIMED embed line belongs to the tile field, so its token styling stands down — otherwise the
  // dim token would underlie the widget. Unclaimed lone-lines (unresolved, ambiguous, or a later
  // duplicate of a claimed title) keep the token: that dim text IS their rendering. The claim is the
  // tile field's own predicate — one owner, so the two layers can't disagree.
  if (conn && scan.embeds.length > 0) {
    const claimed = claimedEmbeds(scan.embeds, (t) => conn.resolve(t).status)
    if (claimed.length > 0)
      tokens = tokens.filter(
        (tk) =>
          !(tk.kind === 'embed' && claimed.some((e) => tk.range[0] >= e.from && tk.range[1] <= e.to)),
      )
  }
  const active = focused
    ? activeTokenIndices(tokens, sel.from, sel.to, view.state.field(linkRest, false) ?? null)
    : NO_ACTIVE
  const typing = focused ? (view.state.field(linkTyping, false) ?? null) : null
  const head = focused ? sel.head : NO_CARET
  const intents = tokenIntents(tokens, active)
  // Loop, never spread — spreading into push throws past V8's argument ceiling on a huge outline,
  // and CM answers a crashed plugin by deactivating it for good (the page falls back to raw source).
  for (const it of assembleLineIntents(scan, docLineIntentsOf(view.state.doc), head)) intents.push(it)
  const ranges: Range<Decoration>[] = []
  for (const it of intents) {
    if (it.kind === 'line') {
      const spec =
        it.level === undefined
          ? { class: it.className }
          : { class: it.className, attributes: { style: `--li-level:${it.level}` } }
      ranges.push(Decoration.line(spec).range(it.from))
      continue
    }
    if (it.kind === 'lineWidget') {
      ranges.push(
        Decoration.widget({ widget: new LineWidget(it.className, it.text), side: -1 }).range(it.from),
      )
      continue
    }
    if (it.kind === 'rail') {
      ranges.push(
        Decoration.widget({
          widget: new OutlinerRailWidget(it.level, it.typeClass, it.first, it.last),
          side: -1,
        }).range(it.from),
      )
      continue
    }
    if (it.to <= it.from) continue
    if (it.kind === 'class')
      ranges.push(Decoration.mark({ class: it.className }).range(it.from, it.to))
    else if (it.kind === 'hide') ranges.push(hideMarker.range(it.from, it.to))
    else ranges.push(Decoration.replace({ widget: widgetFor(it.spec) }).range(it.from, it.to))
  }
  // Markdown links by what their target turns out to name. A target resolving to a page wears the
  // connection colour and leads there; a valid URL is md-link; neither is md-link-invalid (dimmed).
  // Brackets `[ ]`: always shown dimmed for invalid (the broken-link tell), hidden-until-caret otherwise.
  // The `(url)` stays hidden at rest either way; on caret it reveals (valid → italic+underline, invalid → dimmed).
  tokens.forEach((tk, i) => {
    if (tk.kind !== 'link') return
    const [open, close] = tk.markerRanges // `[`  and  `](url)`
    const bracketEnd = close[0] + 1 // the `]`
    const target = resolveMdTarget(conn, linkTarget(text, tk))
    const valid = target.kind !== 'invalid'
    const isActive = active.has(i)
    ranges.push(
      Decoration.mark({
        class:
          target.kind === 'page'
            ? `md-connection-resolved${isActive ? ' md-connection-open' : ''}`
            : valid
              ? 'md-link'
              : 'md-link-invalid',
      }).range(tk.contentRange[0], tk.contentRange[1]),
    )
    const dim = Decoration.mark({ class: 'md-control' })
    if (!valid || isActive) {
      ranges.push(dim.range(open[0], open[1])) // [
      ranges.push(dim.range(close[0], bracketEnd)) // ]
    } else {
      ranges.push(hideMarker.range(open[0], open[1]))
      ranges.push(hideMarker.range(close[0], bracketEnd))
    }
    if (isActive)
      ranges.push(
        Decoration.mark({ class: valid ? 'md-link-url' : 'md-control' }).range(
          bracketEnd,
          close[1],
        ),
      ) // (url)
    else ranges.push(hideMarker.range(bracketEnd, close[1]))
  })
  if (conn) {
    tokens.forEach((tk, i) => {
      if (tk.kind !== 'wikiLink') return
      // An aliased link shows one string and resolves another; the mark stays on what's displayed.
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const status = conn.resolve(text.slice(rs, re)).status
      // Open for editing, its syntax showing: it reads as text, so it points like text.
      const open = active.has(i)
      if (status === 'phantom') {
        // A connection that names no page stays raw `[[Foo]]` — brackets visible and inert — and
        // clicking into one is inspecting an unresolved link, which should look unresolved.
        //
        // One being TYPED takes the connection colour from its first character instead of reading as
        // plain prose until a title happens to match: the author is writing a link and the text
        // should say so. It is not resolved, and doesn't claim to be. Typing is what earns that, not
        // the caret's position, so the field tracks the gesture.
        if (!open || typing !== tk.range[0]) return
        ranges.push(
          Decoration.mark({ class: 'md-connection-typing' }).range(
            tk.contentRange[0],
            tk.contentRange[1],
          ),
        )
        for (const [ms, me] of tk.markerRanges) {
          ranges.push(Decoration.mark({ class: 'md-bracket' }).range(ms, me))
        }
        return
      }
      ranges.push(
        Decoration.mark({
          class: `md-connection-${status}${open ? ' md-connection-open' : ''}`,
        }).range(tk.contentRange[0], tk.contentRange[1]),
      )
      const bracket = open ? Decoration.mark({ class: 'md-bracket' }) : hideMarker
      for (const [s, e] of tk.markerRanges) ranges.push(bracket.range(s, e))
      // Revealed, an aliased connection shows both of its meanings at once: the words the reader
      // sees, and the page they lead to. The target takes the same treatment a markdown link's
      // target takes when revealed, so both syntaxes say "this is where it points" the same way.
      if (open && tk.resolveRange)
        ranges.push(
          Decoration.mark({ class: 'md-link-url' }).range(tk.resolveRange[0], tk.resolveRange[1]),
        )
    })
  }
  for (const { from, to } of view.visibleRanges) {
    for (const m of text.slice(from, to).matchAll(/↔/g)) {
      const p = from + m.index
      ranges.push(Decoration.mark({ class: 'md-sym-bidir' }).range(p, p + 1))
    }
  }
  return Decoration.set(ranges, true)
}

export function markdownDecorations(getConn: () => ConnectionsApi | undefined): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view, getConn())
      }
      update(u: ViewUpdate): void {
        // Inline tokens are viewport-scoped, so scroll (viewportChanged) must rebuild too — newly
        // revealed lines need their decorations. Line-level chrome still spans the whole doc.
        if (
          u.docChanged ||
          u.selectionSet ||
          u.focusChanged ||
          u.viewportChanged ||
          u.transactions.some((tr) => tr.effects.some((e) => e.is(resolutionNudge)))
        )
          this.decorations = build(u.view, getConn())
      }
    },
    { decorations: (v) => v.decorations },
  )
}
