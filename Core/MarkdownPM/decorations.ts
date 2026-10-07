// A ViewPlugin is valid because replaces never cross a line break (block-spanning chrome would need a StateField).
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import {
  EditorSelection,
  EditorState,
  type Extension,
  type Line,
  Prec,
  type Range,
  type Text,
  type Transaction,
} from '@codemirror/state'

import {
  tokenizeChunk,
  activeTokenIndices,
  aliasedToken,
  linkTarget,
  shiftToken,
  type Token,
} from './Engine/tokens'
import {
  docHeadingKeys,
  docLineIntentsOf,
  docScan,
  docSectionHeadings,
  drawnLast,
  perScopedDoc,
} from './docCache'
import type { DiffTally, MarkdownScope } from './Engine/detect'
import { sectionRunsIn } from '../Connections/scan'
import { CHECK_GLYPH, CODE_TAGS, COPY_GLYPH } from './codeGlyphs'
import { claimedEmbeds } from './Engine/embedClaims'
import { linkRest, linkTyping } from './Links/linkReveal'
import {
  assembleLineIntents,
  type DecoIntent,
  GLYPH_CLASS,
  NO_CARET,
  railClass,
  prefixEndAt,
  seatPastMarker,
  tokenIntents,
  type WidgetSpec,
} from './Engine/intents'
import {
  type DocScan,
  caretInMargin,
  chunksOver,
  codeBlockTextAt,
  inCodeAt,
  signSeatAt,
  spanAt,
} from './Engine/docScan'
import { lineEndOf, lineIndexAt } from './Engine/markdownCode'
import { resolveMdTarget, wikiLinkView, type ConnectionsApi } from './Links/connectionsApi'
import type { LinkStatus } from '../Connections/connections'
import { editorHost, pageEditorAt, redrawNudge } from './api'
import { checkMarkSvg, checkboxClass } from '@pommora/uix/Controls/Checkbox'
import * as btn from '@pommora/uix/Buttons/button-base.css'
import { buttonClass, segmentDivider } from '@pommora/uix/Buttons/Button'
import { svgFrame } from '@pommora/uix/Symbols/svgFrame'
import { cx } from '@pommora/uix/Utilities/cx'

export const MD_LINK_CLASS = 'md-link'

// WidgetType.ignoreEvent defaults to true, which would swallow the pointerdown the editor's own gestures act on, like listDrag on a bullet.
export abstract class GlyphWidget extends WidgetType {
  ignoreEvent(): boolean {
    return false
  }
}

class ConnGlyphWidget extends GlyphWidget {
  constructor(readonly status: LinkStatus) {
    super()
  }
  eq(other: ConnGlyphWidget): boolean {
    return other.status === this.status
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = `md-connection-glyph md-connection-glyph-${this.status}`
    return el
  }
}

function connGlyph(status: LinkStatus, at: number): Range<Decoration> {
  return Decoration.widget({ widget: new ConnGlyphWidget(status), side: -1 }).range(at)
}

// The `§` is the separator itself: spaced on both sides after a page half, flush against the heading when it stands alone.
class HeadingJoinWidget extends GlyphWidget {
  constructor(readonly spaced: boolean) {
    super()
  }
  eq(other: HeadingJoinWidget): boolean {
    return other.spaced === this.spaced
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = cx('md-heading-symbol', this.spaced && 'md-heading-symbol-spaced')
    el.textContent = '§'
    return el
  }
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

class BulletWidget extends GlyphWidget {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = `md-list-bullet ${GLYPH_CLASS}`
    el.textContent = '•'
    return el
  }
}

class CheckboxWidget extends GlyphWidget {
  constructor(readonly checked: boolean) {
    super()
  }
  eq(o: CheckboxWidget): boolean {
    return o.checked === this.checked
  }
  toDOM(): HTMLElement {
    const zone = document.createElement('span')
    zone.className = `md-list-checkbox-seat ${GLYPH_CLASS}`
    const box = document.createElement('span')
    box.className = checkboxClass(this.checked)
    if (this.checked) box.innerHTML = checkMarkSvg(12)
    zone.appendChild(box)
    return zone
  }
}

class LineWidget extends GlyphWidget {
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

function mark(body: string, className: string): SVGSVGElement {
  const t = document.createElement('template')
  t.innerHTML = svgFrame(body)
  const svg = t.content.firstElementChild as SVGSVGElement
  svg.setAttribute('class', className)
  return svg
}

const COPIED_MS = 1000

const count = (kind: 'add' | 'del', n: number): string =>
  `<b class="md-diff-${kind}">${kind === 'add' ? '+' : '−'}${Math.abs(n)}</b>`

function tallyPill({ add, del }: DiffTally): HTMLElement {
  const net = add === del ? '<b>±0</b>' : count(add > del ? 'add' : 'del', add - del)
  const run = buttonClass({
    size: 'button-inline',
    inRun: true,
    labeled: true,
    labelOnly: true,
    pointer: true,
  })
  const pill = document.createElement('span')
  pill.className = cx(
    'codeblock-tally',
    btn.container,
    btn.size['button-inline'],
    btn.type.base,
    btn.outlined,
  )
  pill.innerHTML = `<span class="codeblock-tally-counts"><span class="${run}">${net}</span><span class="${segmentDivider}"></span><span class="${run}"><span>${count('add', add)} / ${count('del', del)}</span></span></span><span class="${cx('codeblock-tally-copied', run)}">Copied</span>`
  return pill
}

class CodeTagWidget extends WidgetType {
  constructor(
    readonly name?: string,
    readonly tally?: DiffTally,
  ) {
    super()
  }
  eq(o: CodeTagWidget): boolean {
    return (
      o.name === this.name && o.tally?.add === this.tally?.add && o.tally?.del === this.tally?.del
    )
  }
  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement('span')
    el.className = 'codeblock-language'
    el.dataset.revealHost = ''
    const tag = this.name === undefined ? undefined : CODE_TAGS[this.name]
    const label = tag?.label === undefined ? this.name : tag.label
    const resting = label ?? ''

    const slot = el.appendChild(document.createElement('span'))
    slot.className = 'codeblock-mark-slot'
    if (tag) slot.appendChild(mark(tag.glyph, 'codeblock-mark'))
    slot.appendChild(mark(COPY_GLYPH, 'codeblock-copy'))
    slot.appendChild(mark(CHECK_GLYPH, 'codeblock-copied'))
    const name = el.appendChild(document.createElement('span'))
    name.className = 'codeblock-name'
    name.textContent = resting
    const pill = this.tally ? el.appendChild(tallyPill(this.tally)) : null

    let timer: number | undefined
    const copy = (e: MouseEvent): void => {
      e.preventDefault()
      const text = codeBlockTextAt(docScan(view.state.doc), view.posAtDOM(el))
      if (!text) return
      void view.state.facet(editorHost).clipboard.write(text)
      el.classList.add('is-copied')
      if (resting) name.textContent = 'Copied'
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        el.classList.remove('is-copied')
        name.textContent = resting
      }, COPIED_MS)
    }
    // Swallowed: a caret on the fence line trades the tag back for the raw info word, unmounting what is being pressed.
    for (const target of pill ? [slot, name, pill] : [slot, name]) {
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
    el.className = railClass(this)
    el.style.setProperty('--rail-level', String(this.level))
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}

export class CiteRefWidget extends GlyphWidget {
  constructor(readonly ordinal: number) {
    super()
  }
  eq(o: CiteRefWidget): boolean {
    return o.ordinal === this.ordinal
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'md-citation-reference'
    el.textContent = String(this.ordinal)
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
      return new CheckboxWidget(spec.checked)
    case 'citeRef':
      return new CiteRefWidget(spec.ordinal)
  }
}

const hideMarker = Decoration.replace({})
const atomicSpan = Decoration.mark({})
const NO_ACTIVE = new Set<number>()

const chunkTokens = drawnLast(tokenizeChunk)
const drawnRaw = new WeakMap<EditorView, readonly [number, number][]>()

/** Inside an HTML block the last draw left as written, where a link gesture has no drawn link to act on. */
export const drawnRawAt = (view: EditorView, pos: number): boolean =>
  spanAt(drawnRaw.get(view) ?? [], pos) !== undefined

// On-screen chunks only — the whole-document parse is what made long docs lag.
function visibleInline(view: EditorView, scan: DocScan): ReturnType<typeof tokenizeChunk> {
  const spans = view.visibleRanges.map(({ from, to }): [number, number] => [
    lineIndexAt(scan, from),
    lineIndexAt(scan, to),
  ])
  const tokens: Token[] = []
  const html: [number, number][] = []
  chunkTokens(view, (read) => {
    for (const [a, b] of chunksOver(scan, spans)) {
      const chunk = read(scan.text.slice(a, b))
      for (const tk of chunk.tokens) tokens.push(shiftToken(tk, a))
      for (const [f, t] of chunk.html) html.push([a + f, a + t])
    }
  })
  return { tokens, html }
}

interface Built {
  deco: DecorationSet
  /** The position inside a replaced `- ` is a seat with nothing on screen to mark it. */
  atomic: DecorationSet
}

function atomicsOn(
  perLine: readonly DecoIntent[][],
  from: number,
  to: number,
): Range<Decoration>[] {
  const ranges: Range<Decoration>[] = []
  for (let i = from; i < to; i++)
    for (const it of perLine[i])
      if ((it.kind === 'atomic' || it.kind === 'prefix') && it.to > it.from)
        ranges.push(atomicSpan.range(it.from, it.to))
  return ranges
}

// NOT viewport-scoped: a motion resolved against an unreached slot would seat the caret inside an invisible marker.
export const docAtomics = perScopedDoc(
  (doc, scope) => {
    const { perLine } = docLineIntentsOf(doc, scope)
    return Decoration.set(atomicsOn(perLine, 0, perLine.length), true)
  },
  (prev, tr, scope) => {
    const { perLine, fresh } = docLineIntentsOf.after(tr, scope)
    const scan = docScan.after(tr)
    let set = prev.map(tr.changes)
    for (const [a, e] of fresh)
      set = set.update({
        filter: () => false,
        filterFrom: scan.lineStarts[a],
        filterTo: lineEndOf(scan, e - 1),
        add: atomicsOn(perLine, a, e),
        sort: true,
      })
    return set
  },
)

function atomicFor(
  doc: Text,
  caretLine: Line | null,
  caretAtomics: Range<Decoration>[],
  scope: MarkdownScope,
): DecorationSet {
  const all = docAtomics(doc, scope)
  if (!caretLine) return all
  return all.update({
    add: caretAtomics,
    sort: true,
    filter: () => false,
    filterFrom: caretLine.from,
    filterTo: caretLine.to,
  })
}

function build(view: EditorView, conn: ConnectionsApi | undefined, scope: MarkdownScope): Built {
  // One derivation per doc VERSION (docCache) — a caret move re-derives only its own lines, never an O(doc) walk.
  const scan = docScan(view.state.doc)
  const { text } = scan
  const focused = view.hasFocus
  const sel = view.state.selection.main
  const settings = view.state.facet(editorHost).settings()
  const inline = visibleInline(view, scan)
  // A cell's text parses alone, where a leading tag reads as a block the table never holds.
  const raw = scope === 'page' && settings.htmlFormatting ? inline.html : []
  drawnRaw.set(view, raw)
  let tokens = raw.length > 0 ? inline.tokens.filter((tk) => !tk.inHtml) : inline.tokens
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
  for (const it of assembleLineIntents(
    scan,
    docLineIntentsOf(view.state.doc, scope),
    head,
    view.viewport,
    scope,
    !sel.empty,
  ))
    intents.push(it)
  const ranges: Range<Decoration>[] = []
  const caretAtomics: Range<Decoration>[] = []
  const line = head < 0 ? null : view.state.doc.lineAt(head)
  const caretLine =
    line && line.to >= view.viewport.from && line.from <= view.viewport.to ? line : null
  for (const it of intents) {
    if (it.kind === 'line') {
      const attributes =
        it.level === undefined
          ? it.attributes
          : { ...it.attributes, style: `--list-level:${it.level}` }
      ranges.push(Decoration.line({ class: it.className, attributes }).range(it.from))
      continue
    }
    if (it.kind === 'lineWidget') {
      ranges.push(
        Decoration.widget({
          widget: new LineWidget(it.className, it.text),
          side: it.side ?? -1,
        }).range(it.from),
      )
      continue
    }
    if (it.kind === 'codeTag') {
      ranges.push(
        Decoration.widget({ widget: new CodeTagWidget(it.name, it.tally), side: -1 }).range(
          it.from,
        ),
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
    if (it.kind === 'atomic' || it.kind === 'prefix') {
      if (caretLine && it.from >= caretLine.from && it.to <= caretLine.to)
        caretAtomics.push(atomicSpan.range(it.from, it.to))
      if (it.kind === 'atomic') continue
    }
    if (it.kind === 'class')
      ranges.push(Decoration.mark({ class: it.className }).range(it.from, it.to))
    else if (it.kind === 'hide' || (it.kind === 'prefix' && !it.drawnOver))
      ranges.push(hideMarker.range(it.from, it.to))
    else if (it.kind === 'prefix') continue
    else ranges.push(Decoration.replace({ widget: widgetFor(it.spec) }).range(it.from, it.to))
  }
  tokens.forEach((tk, i) => {
    if (tk.kind !== 'link') return
    const [open, close] = tk.markerRanges
    const bracketEnd = close[0] + 1
    const target = resolveMdTarget(conn, linkTarget(text, tk))
    const valid = target.kind !== 'invalid'
    const internal = target.kind === 'page' || target.kind === 'self'
    const isActive = active.has(i)
    ranges.push(
      Decoration.mark({
        class: internal
          ? cx('md-connection-resolved', isActive && 'md-connection-open')
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
          class: internal ? 'md-connection-target' : valid ? 'md-link-url' : 'md-unresolved-syntax',
        }).range(bracketEnd, close[1]),
      )
      if (internal) ranges.push(connGlyph('resolved', bracketEnd + 1))
    } else {
      ranges.push(hideMarker.range(bracketEnd, close[1]))
    }
  })
  if (conn) {
    const { headingLinkStyle } = settings
    const page = scope === 'cell' ? pageEditorAt(view.dom).view : view
    const ownKeys = page ? docHeadingKeys(page.state.doc) : undefined
    tokens.forEach((tk, i) => {
      if (tk.kind !== 'wikiLink') return
      const alias = aliasedToken(tk)
      const [rs, re] = tk.resolveRange ?? tk.contentRange
      const { status, bare, missing } = wikiLinkView(conn, text, tk, ownKeys)
      const open = active.has(i)
      // `[[#]]` is a link being written: nothing to mark, only its syntax to dim.
      if (tk.contentRange[0] === tk.contentRange[1]) {
        const dim = Decoration.mark({ class: 'md-phantom-syntax' })
        for (const [s, e] of tk.markerRanges) if (e > s) ranges.push(dim.range(s, e))
        return
      }
      // Revealed, an alias shows its whole target, page and heading both.
      const pipe: [number, number] | undefined = alias
        ? [rs, tk.fragment?.[1] ?? re]
        : text[tk.contentRange[1]] === '|'
          ? tk.contentRange
          : undefined
      // Follows the PIPE, not a title that happens to match: an alias for a page that doesn't exist yet still reads as a link.
      if (open && (pipe || status === 'resolved')) {
        ranges.push(connGlyph(status, tk.range[0] + 2))
        if (pipe)
          ranges.push(Decoration.mark({ class: 'md-connection-target' }).range(pipe[0], pipe[1]))
      }
      if (tk.fragment && !open && !alias && status === 'resolved') {
        const [hs, he] = tk.fragment
        const showPage = headingLinkStyle !== 'heading-only' && !bare
        if (!bare)
          ranges.push(
            (showPage ? Decoration.mark({ class: 'md-connection-resolved' }) : hideMarker).range(
              rs,
              re,
            ),
          )
        ranges.push(
          Decoration.replace({ widget: new HeadingJoinWidget(showPage) }).range(hs - 1, hs),
        )
        ranges.push(
          Decoration.mark({
            class: cx(
              'md-connection-resolved md-connection-heading',
              missing && 'md-connection-heading-missing',
            ),
          }).range(hs, he),
        )
        for (const [s, e] of tk.markerRanges) ranges.push(hideMarker.range(s, e))
        return
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
          class: cx(`md-connection-${status}`, open && 'md-connection-open'),
        }).range(tk.contentRange[0], tk.contentRange[1]),
      )
      const bracket = open ? Decoration.mark({ class: 'md-bracket' }) : hideMarker
      for (const [s, e] of tk.markerRanges) ranges.push(bracket.range(s, e))
    })
  }
  if (settings.inPageHeadingResolution === 'automatic') {
    const sectionHeadings = docSectionHeadings(view.state.doc)
    const sectionMark = Decoration.mark({ class: 'md-connection-resolved md-section-run' })
    for (const { from: a, to: b } of view.visibleRanges)
      for (const run of sectionRunsIn(
        text.slice(a, b),
        sectionHeadings,
        (o) => inCodeAt(scan, a + o) || spanAt(raw, a + o) !== undefined,
      ))
        ranges.push(sectionMark.range(a + run.from, a + run.to))
  }
  const bidir = Decoration.mark({ class: 'dual-direction-arrow' })
  for (const { from, to } of view.visibleRanges)
    for (let i = text.indexOf('↔', from); i >= 0 && i < to; i = text.indexOf('↔', i + 1))
      ranges.push(bidir.range(i, i + 1))
  const atomic = atomicFor(view.state.doc, caretLine, caretAtomics, scope)
  return { deco: Decoration.set(ranges, true), atomic }
}

const caretSeat = (scope: MarkdownScope): Extension => {
  const leaveLine = (view: EditorView, extend: boolean): boolean => {
    const { anchor, head } = view.state.selection.main
    const lineStart = view.state.doc.lineAt(head).from
    if ((!extend && anchor !== head) || lineStart === 0 || head === lineStart) return false
    const visible = prefixEndAt(
      docLineIntentsOf(view.state.doc, scope),
      docScan(view.state.doc),
      head,
    )
    if (head !== visible) return false
    const to = view.moveByChar(EditorSelection.cursor(lineStart), false).head
    view.dispatch({
      selection: EditorSelection.range(extend ? anchor : to, to),
      scrollIntoView: true,
      userEvent: 'select',
    })
    return true
  }
  const page = scope === 'page'
  // A diff line's seat draws on the code's side unless a caret was brought into the margin: a step left from the code, or a press left of it. It keeps the margin through an edit that stays on its line, and a selection's head always draws on the code's side.
  const toSide = (view: EditorView, side: -1 | 1): boolean => {
    const { head, empty, assoc } = view.state.selection.main
    const there = side < 0 ? assoc < 0 : assoc >= 0
    if (!page || !empty || there || signSeatAt(docScan(view.state.doc), head) !== head) return false
    view.dispatch({
      selection: EditorSelection.create([EditorSelection.cursor(head, side)]),
      userEvent: side < 0 ? 'select.margin' : 'select',
    })
    return true
  }
  const seatUnder = (view: EditorView, x: number, y: number) => {
    const pos = view.posAtCoords({ x, y })
    const seat = pos === null ? null : signSeatAt(docScan(view.state.doc), pos)
    const code = seat === null ? null : view.coordsAtPos(seat, 1)
    return seat === null || !code ? null : { seat, margin: x < code.left }
  }
  const pressMargin = EditorView.mouseSelectionStyle.of((view, start) => {
    if (
      !page ||
      start.button !== 0 ||
      start.detail > 2 ||
      start.shiftKey ||
      start.altKey ||
      start.metaKey ||
      start.ctrlKey
    )
      return null
    const under = seatUnder(view, start.clientX, start.clientY)
    // A press past the end of a line with no code resolves to its seat on the margin's side, so this style seats that one too, on the code's.
    if (!under || (!under.margin && under.seat !== view.state.doc.lineAt(under.seat).to))
      return null
    const side = under.margin ? -1 : 1
    let { seat } = under
    return {
      get: (e) => {
        const head = view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
        const back = head <= seat && head >= view.state.doc.lineAt(seat).from
        return EditorSelection.create([
          back ? EditorSelection.cursor(seat, side) : EditorSelection.range(seat, head),
        ])
      },
      update: (u) => {
        seat = u.changes.mapPos(seat)
      },
    }
  })
  // A drop into the margin lands nothing, as a paste there does.
  const dropMargin = EditorView.domEventHandlers({
    drop(e, view) {
      if (!page || !seatUnder(view, e.clientX, e.clientY)?.margin) return false
      e.preventDefault()
      return true
    },
  })
  const inMargin = (tr: Transaction, seat: number): boolean => {
    if (tr.isUserEvent('select.margin')) return true
    if (tr.isUserEvent('select.pointer')) return tr.newSelection.main.assoc < 0
    const was = tr.startState.selection.main
    return (
      tr.docChanged &&
      caretInMargin(docScan(tr.startState.doc), was) &&
      tr.newDoc.lineAt(tr.changes.mapPos(was.head, -1)).from === tr.newDoc.lineAt(seat).from
    )
  }
  const run = (view: EditorView) => leaveLine(view, false)
  const shift = (view: EditorView) => leaveLine(view, true)
  return [
    pressMargin,
    dropMargin,
    EditorState.transactionFilter.of((tr) => {
      if (!tr.selection && !tr.docChanged) return tr
      const { anchor, head, empty, assoc } = tr.newSelection.main
      const intents = docLineIntentsOf.after(tr, scope)
      const scan = docScan.after(tr)
      const visible = prefixEndAt(intents, scan, head)
      const seat =
        (head < visible
          ? visible
          : empty && tr.isUserEvent('select.pointer')
            ? seatPastMarker(intents, scan, head, scope)
            : null) ?? head
      let side = assoc
      if (page && signSeatAt(scan, seat) === seat) side = empty && inMargin(tr, seat) ? -1 : 1
      if (seat === head && side === assoc) return tr
      const selection = tr.newSelection.replaceRange(
        empty
          ? EditorSelection.cursor(seat, side)
          : EditorSelection.range(anchor, seat, undefined, undefined, side),
      )
      return [tr, { selection, sequential: true }]
    }),
    Prec.high(
      keymap.of([
        { key: 'ArrowLeft', run: (view) => toSide(view, -1) || run(view), shift },
        { key: 'ArrowRight', run: (view) => toSide(view, 1) },
        { key: 'Mod-ArrowLeft', mac: 'Alt-ArrowLeft', run, shift },
      ]),
    ),
  ]
}

const stepDocs = (scope: MarkdownScope): Extension =>
  EditorState.transactionExtender.of((tr) => {
    if (tr.docChanged) docAtomics.after(tr, scope)
    return null
  })

export function markdownDecorations(
  getConn: () => ConnectionsApi | undefined,
  scope: MarkdownScope = 'page',
): Extension {
  return [stepDocs(scope), decorationPlugin(getConn, scope), caretSeat(scope)]
}

function decorationPlugin(
  getConn: () => ConnectionsApi | undefined,
  scope: MarkdownScope,
): Extension {
  return ViewPlugin.fromClass(
    class {
      built: Built
      constructor(view: EditorView) {
        this.built = build(view, getConn(), scope)
      }
      update(u: ViewUpdate): void {
        // Inline tokens are viewport-scoped, so scroll must rebuild too; line-level chrome spans the whole doc.
        if (
          u.docChanged ||
          u.selectionSet ||
          u.focusChanged ||
          u.viewportChanged ||
          u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge)))
        )
          this.built = build(u.view, getConn(), scope)
      }
    },
    {
      decorations: (v) => v.built.deco,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.built.atomic ?? Decoration.none),
    },
  )
}
