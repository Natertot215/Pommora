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

import { tokenize, activeTokenIndices, linkTarget, shiftToken, type Token } from './Engine/tokens'
import { docLineIntentsOf, docScan, docSpanTokens, docString, perDoc } from './docCache'
import { CHECK_GLYPH, CODE_TAGS, COPY_GLYPH } from './codeGlyphs'
import { claimedEmbeds } from './Engine/embedRanges'
import { resolutionNudge } from './Embeds/embedWidget'
import { linkRest, linkTyping } from './Gestures/linkGestures'
import {
  assembleLineIntents,
  type DocScan,
  GLYPH_CLASS,
  codeBlockTextAt,
  lineIndexAt,
  NO_CARET,
  tokenIntents,
  type WidgetSpec,
} from './Engine/docScan'
import { resolveMdTarget, type ConnectionsApi } from './Links/connectionsApi'
import type { LinkStatus } from '@pommora/core/Connections/connections'
import { host } from '../Platform/dialer'

export const MD_LINK_CLASS = 'md-link'

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
  // WidgetType.ignoreEvent defaults to true, which would swallow the listDrag pointerdown on a bullet glyph.
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
    const zone = document.createElement('span')
    zone.className = `md-li-marker ${GLYPH_CLASS}`
    const box = document.createElement('span')
    box.className = `checkbox${this.checked ? ' checkbox-checked' : ''}`
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
  ignoreEvent(): boolean {
    return false
  }
}

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

const COPIED_MS = 1000

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

    const reach = el.appendChild(document.createElement('span'))
    reach.className = 'md-cb-reach'
    const slot = el.appendChild(document.createElement('span'))
    slot.className = 'md-cb-slot'
    if (tag) slot.appendChild(mark(tag.glyph, 'md-cb-mark'))
    slot.appendChild(mark(COPY_GLYPH, 'md-cb-copy'))
    slot.appendChild(mark(CHECK_GLYPH, 'md-cb-done'))
    const name = el.appendChild(document.createElement('span'))
    name.className = 'md-cb-name'
    name.textContent = resting

    // A press inside the arc is a press on the code it is drawn over; falling through would land on the fence line.
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
      const text = codeBlockTextAt(docScan(view.state.doc), view.posAtDOM(el))
      if (!text) return
      void host().ask('clipboard:write', text)
      el.classList.add('is-copied')
      if (resting) name.textContent = 'Copied'
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        el.classList.remove('is-copied')
        name.textContent = resting
      }, COPIED_MS)
    }
    // Swallowed: a caret on the fence line trades the tag back for the raw info word, unmounting what is being pressed.
    for (const target of [slot, name]) {
      target.addEventListener('mousedown', (e) => e.preventDefault())
      target.addEventListener('click', copy)
    }
    return el
  }
  ignoreEvent(e: Event): boolean {
    return e.type === 'mousedown' || e.type === 'click'
  }
}

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
const atomicSpan = Decoration.mark({})
const NO_ACTIVE = new Set<number>()

const INDENTED = /^[ \t]/

/** A slice opens on a line whose block context is self-evident: resuming inside a fence would invert every parity below. */
export function sliceStartLine(scan: DocScan, line: number): number {
  let i = line
  while (i < scan.lines.length && scan.fences[i] && scan.fences[i]?.role !== 'open') i++
  while (i > 0 && INDENTED.test(scan.lines[i]) && !scan.fences[i - 1]) i--
  return i
}

// On-screen lines only — the whole-document parse is what made long docs lag. Rebuilt on `viewportChanged`.
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

interface Built {
  deco: DecorationSet
  /** The position inside a replaced `- ` is a seat with nothing on screen to mark it. */
  atomic: DecorationSet
}

// NOT viewport-scoped: a motion resolved against an unreached slot would seat the caret inside an invisible marker.
const docAtomics = perDoc((doc) => {
  const ranges: Range<Decoration>[] = []
  for (const line of docLineIntentsOf(doc).perLine)
    for (const it of line)
      if (it.kind === 'atomic' && it.to > it.from) ranges.push(atomicSpan.range(it.from, it.to))
  return Decoration.set(ranges, true)
})

/** Minus the caret's own line, which reveals its raw source. Bounded there, so a caret move never walks the document. */
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
  // One derivation per doc VERSION (docCache) — a caret move re-derives only its own lines, never an O(doc) walk.
  const scan = docScan(view.state.doc)
  const focused = view.hasFocus
  const sel = view.state.selection.main
  let tokens = visibleInlineTokens(view, text, scan)
  // A CLAIMED embed line's token styling stands down; the claim is the tile field's own predicate, so one owner decides.
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
  // Loop, never spread — a spread into push throws past V8's argument ceiling, and CM deactivates a crashed plugin for good.
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
  // Brackets: dimmed for invalid (the broken-link tell), hidden-until-caret otherwise.
  tokens.forEach((tk, i) => {
    if (tk.kind !== 'link') return
    const [open, close] = tk.markerRanges
    const bracketEnd = close[0] + 1
    const target = resolveMdTarget(conn, linkTarget(text, tk))
    const valid = target.kind !== 'invalid'
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
      ranges.push(dim.range(open[0], open[1]))
      ranges.push(dim.range(close[0], bracketEnd))
    } else {
      ranges.push(hideMarker.range(open[0], open[1]))
      ranges.push(hideMarker.range(close[0], bracketEnd))
    }
    if (isActive) {
      ranges.push(
        Decoration.mark({
          class: internal ? 'md-conn-target' : valid ? 'md-link-url' : 'md-unresolved-syntax',
        }).range(bracketEnd, close[1]),
      )
      if (internal) ranges.push(connGlyph('resolved', bracketEnd + 1))
    } else {
      ranges.push(hideMarker.range(bracketEnd, close[1]))
    }
  })
  if (conn) {
    tokens.forEach((tk, i) => {
      if (tk.kind !== 'wikiLink') return
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const status = conn.resolve(text.slice(rs, re)).status
      const open = active.has(i)
      const pipe =
        tk.resolveRange ?? (text[tk.contentRange[1]] === '|' ? tk.contentRange : undefined)
      // Follows the PIPE, not a title that happens to match: an alias for a page that doesn't exist yet still reads as a link.
      if (open && (pipe || status === 'resolved')) {
        ranges.push(connGlyph(status, tk.range[0] + 2))
        if (pipe) ranges.push(Decoration.mark({ class: 'md-conn-target' }).range(pipe[0], pipe[1]))
      }
      if (status === 'phantom') {
        // Typing is what earns the connection color, not the caret's position, so the field tracks the gesture.
        const writing = typing === tk.range[0]
        ranges.push(
          Decoration.mark({
            class: writing ? 'md-connection-typing' : 'md-connection-phantom',
          }).range(tk.contentRange[0], tk.contentRange[1]),
        )
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
  const bidir = Decoration.mark({ class: 'dual-direction-arrow' })
  for (const { from, to } of view.visibleRanges)
    for (let i = text.indexOf('↔', from); i >= 0 && i < to; i = text.indexOf('↔', i + 1))
      ranges.push(bidir.range(i, i + 1))
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
        // Inline tokens are viewport-scoped, so scroll must rebuild too; line-level chrome spans the whole doc.
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
