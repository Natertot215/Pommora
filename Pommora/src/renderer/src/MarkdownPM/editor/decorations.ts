// A ViewPlugin is valid because replaces never cross a line break (block-spanning chrome would need a StateField).
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import type { Extension, Range, Text } from '@codemirror/state'

import { tokenize, activeTokenIndices, linkTarget, shiftToken, type Token } from '../tokens'
import {
  docBidirMarks,
  docLineIntentsOf,
  docScan,
  docSpanTokens,
  docString,
  perDoc,
} from './docCache'
import { CHECK_GLYPH, CODE_TAGS, COPY_GLYPH } from './codeGlyphs'
import { claimedEmbeds } from './embedRanges'
import { resolutionNudge } from './embedWidget'
import { linkRest, linkTyping } from './linkGestures'
import {
  assembleLineIntents,
  type DocScan,
  GLYPH_CLASS,
  codeBlockTextAt,
  lineIndexAt,
  NO_CARET,
  tokenIntents,
  type WidgetSpec,
} from '../decorations/intent'
import { resolveMdTarget, type ConnectionsApi } from '../connections'
import type { LinkStatus } from '@shared/connections'
import { boxGeometry } from '@renderer/design-system/labels'

/** The class a valid external link wears — the hover gate reads the same constant, so the
 *  decorator and the arming selector cannot drift. */
export const MD_LINK_CLASS = 'md-link'

/** The `link-2` glyph a revealed connection wears in front of its target. It reports whether that
 *  target resolves — the connection color means a page answers to it — which is the one thing the
 *  syntax itself can't say. Worn as a mask so the color comes from the class, not the artwork. */
class ConnGlyphWidget extends WidgetType {
  constructor(readonly status: LinkStatus) {
    super()
  }
  eq(other: ConnGlyphWidget): boolean {
    return other.status === this.status
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = `md-conn-glyph md-conn-glyph-${this.status}`
    return el
  }
  ignoreEvent(): boolean {
    return false
  }
}

/** The glyph introducing a revealed target, wherever the syntax puts one. `side: -1` binds it to the
 *  left of the position, so the caret sits AFTER it — the glyph introduces the target rather than
 *  interrupting the first keystroke. */
function connGlyph(status: LinkStatus, at: number): Range<Decoration> {
  return Decoration.widget({ widget: new ConnGlyphWidget(status), side: -1 }).range(at)
}

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
    box.className = `${boxGeometry} pm-checkbox${this.checked ? ' pm-checkbox-checked' : ''}`
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
  /** Every glyph of this kind is decoration over a line that is still text, so a press on one
   *  belongs to that line rather than to the widget. Left at CM's default the widget swallows it,
   *  and the line's own menu is unreachable from the one part of it drawn rather than written. */
  ignoreEvent(): boolean {
    return false
  }
}

/** A 24×24 mark, built rather than styled in: a widget is raw DOM with no React under it, and an
 *  `<svg>` carries `currentColor` so each mark takes the tone its own slot names. */
function mark(body: string, className: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.innerHTML = body
  svg.setAttribute('class', className)
  return svg
}

/** How long the tag holds its answer before returning to what it was showing. */
const COPIED_MS = 1000

/** A code block's tag. One rule governs it whatever the block named: a language's own mark rests,
 *  the copy mark takes its place under the pointer, and the check answers a press. A block that
 *  named no language rests as nothing and reveals the same way — the affordance is the hover, not
 *  the language.
 *
 *  The three marks share one fixed slot and are all built once, so which of them shows is an opacity
 *  and never a rebuild. */
class CodeTagWidget extends WidgetType {
  constructor(readonly name?: string) {
    super()
  }
  eq(o: CodeTagWidget): boolean {
    return o.name === this.name
  }
  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-cb-lang'
    const tag = this.name === undefined ? undefined : CODE_TAGS[this.name]
    const label = tag?.label === undefined ? this.name : tag.label
    const resting = label ?? ''

    // The zone that arms the mark: the tag is a few characters in the corner, and reaching it means
    // aiming. A real child rather than a pseudo-element, so the marks paint over it.
    const reach = el.appendChild(document.createElement('span'))
    reach.className = 'md-cb-reach'
    const slot = el.appendChild(document.createElement('span'))
    slot.className = 'md-cb-slot'
    if (tag) slot.appendChild(mark(tag.glyph, 'md-cb-mark'))
    slot.appendChild(mark(COPY_GLYPH, 'md-cb-copy'))
    slot.appendChild(mark(CHECK_GLYPH, 'md-cb-done'))
    // The word the tag carries, and the word it answers a press with. Empty is hidden in CSS, so a
    // tag with no language to name carries no phantom gap and answers with the check alone.
    const name = el.appendChild(document.createElement('span'))
    name.className = 'md-cb-name'
    name.textContent = resting

    // The arc arms the mark and nothing more: a press inside it is a press on the code it is drawn
    // over, placed where the pointer actually is. Left to fall through it would land on the widget's
    // own position instead — the fence line, wherever in the block the press landed.
    reach.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const at = view.posAtCoords({ x: e.clientX, y: e.clientY })
      if (at === null) return
      view.dispatch({ selection: { anchor: at } })
      view.focus()
    })

    let timer: number | undefined
    const copy = (e: MouseEvent): void => {
      e.preventDefault()
      // Read at press time: two blocks in the same language are `eq`, so CM reuses the DOM and a
      // range baked in at build time would name whichever of them mounted first.
      const text = codeBlockTextAt(docScan(view.state.doc), view.posAtDOM(el))
      if (!text) return
      void window.nexus.writeClipboard(text)
      el.classList.add('is-copied')
      if (resting) name.textContent = 'Copied'
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        el.classList.remove('is-copied')
        name.textContent = resting
      }, COPIED_MS)
    }
    // The press is swallowed rather than allowed through: a caret landing on the fence line is what
    // trades the tag back for the raw info word, which would unmount the thing being pressed.
    for (const target of [slot, name]) {
      target.addEventListener('mousedown', (e) => e.preventDefault())
      target.addEventListener('click', copy)
    }
    return el
  }
  /** The press belongs to the tag; every other event belongs to the line under it, so the fence's
   *  own context menu stays reachable from the chrome drawn over it. */
  ignoreEvent(e: Event): boolean {
    return e.type === 'mousedown' || e.type === 'click'
  }
}

// One outliner rail: an ancestor-level vertical guide, pinned at the line start (side -1) and positioned +
// shaped entirely in CSS from --rail-level (its ancestor column) plus the type class (glyph-center offset).
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

/** A body marker's number, standing over the `[^label]` the reader never sees. It takes clicks —
 *  jump to the citation, or the construct menu — so it states `ignoreEvent` rather than taking the
 *  default, which would swallow every event before a handler saw it. */
export class CiteRefWidget extends WidgetType {
  constructor(readonly ordinal: number) {
    super()
  }
  eq(o: CiteRefWidget): boolean {
    return o.ordinal === this.ordinal
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-cite-ref'
    el.textContent = String(this.ordinal)
    return el
  }
  ignoreEvent(): boolean {
    return false
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
    case 'citeRef':
      return new CiteRefWidget(spec.ordinal)
  }
}

const hideMarker = Decoration.replace({})
/** Carries no styling — `atomicRanges` reads only the range, the way the callout prefix's does. */
const atomicSpan = Decoration.mark({})
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

/** What the plugin derives in one pass: what to draw, and which of those spans the caret must not
 *  enter. The two travel together because they are the same fact — a marker slot filled by a widget
 *  has interior positions with nothing on screen to stand for them. */
interface Built {
  deco: DecorationSet
  /** The marker slots a widget stands in. A list line's `- ` is replaced whole, so the position
   *  between the dash and its space is a seat with nothing on screen to mark it: the caret can land
   *  there, the drawn caret renders at the widget's edge instead, and a selection anchored there
   *  takes marker characters the reader can't see. The callout prefix is guarded this way for the
   *  same reason. */
  atomic: DecorationSet
}

// Every atomic slot in the document, one derivation per doc VERSION. Unlike the drawn chrome this
// is NOT viewport-scoped: `atomicRanges` decides where a caret or a selection endpoint may land,
// and a motion resolved against a slot the viewport hasn't reached would seat the caret inside a
// marker nothing on screen stands for.
const docAtomics = perDoc((doc) => {
  const ranges: Range<Decoration>[] = []
  for (const line of docLineIntentsOf(doc).perLine)
    for (const it of line)
      if (it.kind === 'atomic' && it.to > it.from) ranges.push(atomicSpan.range(it.from, it.to))
  return Decoration.set(ranges, true)
})

/** The atomic set for a caret position: the whole document's slots, minus the caret's own line —
 *  which reveals its raw source, so its marker is ordinary editable text while the caret is there.
 *  The filter is bounded to that one line, so a caret move never walks the document's slots. */
function atomicFor(doc: Text, scan: DocScan, head: number): DecorationSet {
  const all = docAtomics(doc)
  if (head < 0) return all
  const i = lineIndexAt(scan, head)
  return all.update({
    filter: () => false,
    filterFrom: scan.lineStarts[i],
    filterTo: scan.lineStarts[i] + scan.lines[i].length,
  })
}

function build(view: EditorView, conn: ConnectionsApi | undefined): Built {
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
          !(
            tk.kind === 'embed' && claimed.some((e) => tk.range[0] >= e.from && tk.range[1] <= e.to)
          ),
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
  for (const it of assembleLineIntents(scan, docLineIntentsOf(view.state.doc), head, view.viewport))
    intents.push(it)
  const ranges: Range<Decoration>[] = []
  const atomic = atomicFor(view.state.doc, scan, head)
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
        Decoration.widget({ widget: new LineWidget(it.className, it.text), side: -1 }).range(
          it.from,
        ),
      )
      continue
    }
    if (it.kind === 'codeTag') {
      ranges.push(
        Decoration.widget({ widget: new CodeTagWidget(it.name), side: -1 }).range(it.from),
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
    if (it.kind === 'atomic') continue // whole-document, built by atomicFor
    if (it.kind === 'class')
      ranges.push(Decoration.mark({ class: it.className }).range(it.from, it.to))
    else if (it.kind === 'hide') ranges.push(hideMarker.range(it.from, it.to))
    else ranges.push(Decoration.replace({ widget: widgetFor(it.spec) }).range(it.from, it.to))
  }
  // Markdown links by what their target turns out to name. A target resolving to a page wears the
  // connection color and leads there; a valid URL is md-link; neither is md-link-invalid (dimmed).
  // Brackets `[ ]`: always shown dimmed for invalid (the broken-link tell), hidden-until-caret otherwise.
  // The `(url)` stays hidden at rest either way; on caret it reveals (valid → italic+underline, invalid → dimmed).
  tokens.forEach((tk, i) => {
    if (tk.kind !== 'link') return
    const [open, close] = tk.markerRanges // `[`  and  `](url)`
    const bracketEnd = close[0] + 1 // the `]`
    const target = resolveMdTarget(conn, linkTarget(text, tk))
    const valid = target.kind !== 'invalid'
    // What the target turns out to name decides both the words' color and, once revealed, the
    // treatment of the target itself — so it is decided once here.
    const internal = target.kind === 'page'
    const isActive = active.has(i)
    ranges.push(
      Decoration.mark({
        class: internal
          ? `md-connection-resolved${isActive ? ' md-connection-open' : ''}`
          : valid
            ? MD_LINK_CLASS
            : 'md-link-invalid',
      }).range(tk.contentRange[0], tk.contentRange[1]),
    )
    const dim = Decoration.mark({ class: valid ? 'md-control' : 'md-unresolved-syntax' })
    if (!valid || isActive) {
      ranges.push(dim.range(open[0], open[1])) // [
      ranges.push(dim.range(close[0], bracketEnd)) // ]
    } else {
      ranges.push(hideMarker.range(open[0], open[1]))
      ranges.push(hideMarker.range(close[0], bracketEnd))
    }
    if (isActive) {
      // The revealed target, treated by what it names. A website reads as a URL; a page reads as a
      // destination and is introduced by the same glyph a connection wears, since it is one.
      ranges.push(
        Decoration.mark({
          class: internal ? 'md-conn-target' : valid ? 'md-link-url' : 'md-unresolved-syntax',
        }).range(bracketEnd, close[1]),
      ) // (url)
      if (internal) ranges.push(connGlyph('resolved', bracketEnd + 1))
    } else {
      ranges.push(hideMarker.range(bracketEnd, close[1]))
    }
  })
  if (conn) {
    tokens.forEach((tk, i) => {
      if (tk.kind !== 'wikiLink') return
      // An aliased link shows one string and resolves another; the mark stays on what's displayed.
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const status = conn.resolve(text.slice(rs, re)).status
      // Open for editing, its syntax showing: it reads as text, so it points like text.
      const open = active.has(i)
      // The target span of a link that wears a pipe. An alias splits the two meanings apart; a pipe
      // opened and not yet written leaves the title standing as both, and it is still a target.
      const pipe =
        tk.resolveRange ?? (text[tk.contentRange[1]] === '|' ? tk.contentRange : undefined)
      // Revealed, a connection wearing a pipe shows both of its meanings at once: the words the
      // reader sees, and the page they lead to. The target is marked as a target and introduced by
      // the link glyph, which is the thing that reports whether it resolves — so this follows the
      // PIPE rather than waiting on a title that happens to match something. Typing an alias for a
      // page that doesn't exist yet should still look like writing a link.
      if (open && (pipe || status === 'resolved')) {
        ranges.push(connGlyph(status, tk.range[0] + 2))
        // Only where an alias took the title's place does the title stop being what's shown and
        // become a destination. Standing on its own, it IS the link's words and keeps their color.
        if (pipe) ranges.push(Decoration.mark({ class: 'md-conn-target' }).range(pipe[0], pipe[1]))
      }
      if (status === 'phantom') {
        // A connection that names no page keeps its brackets, and reads as the unresolved link it
        // is — clicking into one is inspecting an unresolved link, which should look unresolved.
        //
        // One being TYPED takes the connection color from its first character instead: the author is
        // writing a link and the text should say so. It is not resolved, and doesn't claim to be.
        // Typing is what earns that, not the caret's position, so the field tracks the gesture.
        const writing = typing === tk.range[0]
        ranges.push(
          Decoration.mark({
            class: writing ? 'md-connection-typing' : 'md-connection-phantom',
          }).range(tk.contentRange[0], tk.contentRange[1]),
        )
        // Syntax being authored is syntax either way; the rest is the unresolved link's own, and
        // follows it wherever the setting takes it.
        const bracket = Decoration.mark({
          class: open && (writing || pipe) ? 'md-bracket' : 'md-phantom-syntax',
        })
        for (const [ms, me] of tk.markerRanges) ranges.push(bracket.range(ms, me))
        return
      }
      ranges.push(
        Decoration.mark({
          class: `md-connection-${status}${open ? ' md-connection-open' : ''}`,
        }).range(tk.contentRange[0], tk.contentRange[1]),
      )
      const bracket = open ? Decoration.mark({ class: 'md-bracket' }) : hideMarker
      for (const [s, e] of tk.markerRanges) ranges.push(bracket.range(s, e))
    })
  }
  for (const p of docBidirMarks(view.state.doc))
    if (view.visibleRanges.some(({ from, to }) => p >= from && p < to))
      ranges.push(Decoration.mark({ class: 'md-sym-bidir' }).range(p, p + 1))
  return { deco: Decoration.set(ranges, true), atomic }
}

export function markdownDecorations(getConn: () => ConnectionsApi | undefined): Extension {
  return ViewPlugin.fromClass(
    class {
      built: Built
      constructor(view: EditorView) {
        this.built = build(view, getConn())
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
          this.built = build(u.view, getConn())
      }
    },
    {
      decorations: (v) => v.built.deco,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.built.atomic ?? Decoration.none),
    },
  )
}
