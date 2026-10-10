import type { Token, TokenKind } from './tokens'
import {
  isThematicBreakLine,
  isHeadingLine,
  isSequenced,
  parseListMarker,
  headingParts,
  fenceBodyStart,
  awaitsSign,
  signedLine,
  type CalloutLine,
  type CitationEntry,
  type DiffTally,
  type FenceInfo,
  type ListMarker,
  type MarkdownScope,
  readsLists,
} from './detect'
import { carriedFrom, type DocScan, spanAt } from './docScan'
import { isBlockquoteLine, lineIndexAt, quotePrefix, quotePrefixWidth } from './markdownCode'
import { cx } from '@pommora/uix/Utilities/cx'

function calloutNestedQuote(
  lines: string[],
  callouts: (CalloutLine | undefined)[],
  k: number,
): boolean {
  const co = k >= 0 && k < lines.length ? callouts[k] : undefined
  if (!co) return false
  const inner = lines[k].slice(co.prefixEnd)
  return isBlockquoteLine(inner)
}

export const GLYPH_CLASS = 'md-list-glyph'

export const GRIP_HOST = { 'data-reveal-host': 'off', 'data-grip': '' }
export const GRIP_LINE = '.cm-line[data-grip]'

// A marker whose text stays on screen needs one real space after it, or the reader's first word joins it into `2.Preserve` and the platform checker underlines the pair. The space is drawn at zero width; the visible gap is the glyph's own padding.
// An item with nothing after the gap has no word to join, and the collapsed space would be the only thing the caret could sit against, so the whole gap goes.
function pushMarkerGap(intents: DecoIntent[], from: number, to: number, le: number): void {
  if (to >= le) {
    intents.push({ kind: 'hide', from, to })
    return
  }
  intents.push({ kind: 'class', from, to: from + 1, className: 'md-list-gap' })
  if (to > from + 1) intents.push({ kind: 'hide', from: from + 1, to })
}

function pushPrefix(intents: DecoIntent[], from: number, to: number, drawnOver = false): void {
  if (to > from) intents.push({ kind: 'prefix', from, to, drawnOver })
}

function pushListLine(intents: DecoIntent[], ls: number, innerStart: number, lm: ListMarker): void {
  intents.push({ kind: 'line', from: ls, className: listLineClass(lm), level: lm.level })
  pushPrefix(intents, innerStart, innerStart + lm.markerStart)
}

const glyphOf = (e: CitationEntry): string => (e.ordinal === null ? '–' : `${e.ordinal}.`)

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; checked: boolean }
  | { type: 'citeRef'; ordinal: number }

type RailIntent = {
  kind: 'rail'
  from: number
  level: number
  typeClass: string
  first: boolean
  last: boolean
}

export type DecoIntent =
  | { kind: 'class'; from: number; to: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  | { kind: 'atomic'; from: number; to: number }
  | { kind: 'prefix'; from: number; to: number; drawnOver: boolean }
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string; text?: string; side?: 1 }
  | { kind: 'codeTag'; from: number; name?: string; tally?: DiffTally; path?: string }
  | {
      kind: 'line'
      from: number
      className: string
      level?: number
      attributes?: Record<string, string>
    }
  | RailIntent

// The rail's x sits on its ANCESTOR's glyph center; ordered / arrow / `+` return null, so no rail is drawn under one.
export function railTypeClass(m: ListMarker): string | null {
  if (m.kind === 'checkbox') return 'md-outline-task'
  if (m.kind === 'bullet' && m.bullet === '-') return 'md-outline-bullet'
  if (m.kind === 'alphabetical') return 'md-outline-alpha'
  return null
}

export const railClass = (r: Pick<RailIntent, 'typeClass' | 'first' | 'last'>): string =>
  cx('md-outline-rail', r.typeClass, r.first && 'md-outline-first', r.last && 'md-outline-last')

// The form a marker is DRAWN as, and the line class that carries it — one answer for the editor's decorations and the resting cell's DOM alike.
// Null where the source parses as a marker but nothing draws one: a bullet holding an empty box is prose, and both renderers have to agree on that.
export type ListGlyph = 'checkbox' | 'bullet' | 'arrow' | 'number'

export function listGlyphOf(lm: ListMarker): ListGlyph | null {
  if (lm.kind === 'checkbox' && lm.box) return 'checkbox'
  if (lm.kind === 'bullet' && lm.bullet === '-' && !lm.box) return 'bullet'
  if (lm.kind === 'arrow' || (lm.kind === 'bullet' && lm.bullet === '+' && !lm.box)) return 'arrow'
  return isSequenced(lm.kind) ? 'number' : null
}

export function listLineClass(lm: ListMarker): string {
  if (lm.kind === 'checkbox') return cx('md-list-item md-list-task', lm.checked && 'md-list-done')
  return isSequenced(lm.kind) ? 'md-list-item md-list-ordered' : 'md-list-item'
}

const CONTENT_CLASS: Partial<Record<TokenKind, string>> = {
  bold: 'md-bold',
  italic: 'md-italic',
  strikethrough: 'md-strike',
  inlineCode: 'md-code',
  highlight: 'md-highlight',
  inlineLatex: 'md-latex',
  blockLatex: 'md-latex',
  htmlTag: 'md-html-tag',
}

export const contentClass = (tk: Token): string | undefined =>
  tk.color ? `${CONTENT_CLASS.highlight} md-highlight-${tk.color}` : CONTENT_CLASS[tk.kind]

export function tokenIntents(tokens: Token[], active: Set<number>): DecoIntent[] {
  const intents: DecoIntent[] = []
  tokens.forEach((tk, i) => {
    if (tk.kind === 'wikiLink' || tk.kind === 'link' || tk.kind === 'citationRef') return
    const cls = contentClass(tk)
    if (cls)
      intents.push({
        kind: 'class',
        from: tk.contentRange[0],
        to: tk.contentRange[1],
        className: cls,
      })
    // A tag's brackets are its syntax on show, never hidden.
    if (tk.kind === 'htmlTag')
      for (const [s, e] of tk.markerRanges)
        intents.push({ kind: 'class', from: s, to: e, className: 'md-bracket' })
    else if (!active.has(i))
      for (const [s, e] of tk.markerRanges) intents.push({ kind: 'hide', from: s, to: e })
  })
  return intents
}

const barred = (f: FenceInfo | undefined): boolean => signedLine(f) && f?.diff !== 'same'

// Null where the line is chrome of its own and never enters the list vocabulary; otherwise the offset the list grammar starts at.
// A cell holds no box, no fence, no math and no citation row, and its own extension draws the footnote markers, so none of this is walked there.
function pageChrome(
  scan: DocScan,
  i: number,
  selStart: number,
  intents: DecoIntent[],
): number | null {
  const { lines, lineStarts, fences, callouts, quotes } = scan
  const line = lines[i]
  const ls = lineStarts[i]
  const le = ls + line.length
  let base = 0

  const fence = fences[i]
  const co = callouts[i]
  if (co) {
    intents.push({
      kind: 'line',
      from: ls,
      className: cx('md-callout', co.first && 'md-callout-first', co.last && 'md-callout-last'),
      attributes: co.first ? GRIP_HOST : undefined,
    })
    base = co.prefixEnd
    const inner = line.slice(base)
    const qm = quotePrefix(inner)
    if (qm && (fence === undefined || fence.depth > 1)) {
      const first = !calloutNestedQuote(lines, callouts, i - 1)
      const last = !calloutNestedQuote(lines, callouts, i + 1)
      intents.push({
        kind: 'line',
        from: ls,
        className: cx(
          'md-blockquote-nested',
          first && 'md-blockquote-nested-first',
          last && 'md-blockquote-nested-last',
        ),
      })
      // The bar is a real element so it sits OVER the fill with its own caps; a fill `::after` would clip one.
      intents.push({ kind: 'lineWidget', from: ls, className: 'md-blockquote-nested-bar' })
      base += qm.length
    }
  } else if (quotes[i]) {
    const full = quotePrefix(line)
    const first = i === 0 || !quotes[i - 1]
    const last = i === lines.length - 1 || !quotes[i + 1]
    intents.push({
      kind: 'line',
      from: ls,
      className: cx('md-blockquote', first && 'md-blockquote-first', last && 'md-blockquote-last'),
      attributes: first ? GRIP_HOST : undefined,
    })
    base = line.slice(full.length).trim() === '' ? quotePrefixWidth(line, 1) : full.length
  }

  if (fence) {
    const innerStart = ls + fenceBodyStart(line, fence)
    const caretOnLine = selStart >= ls && selStart <= le
    const signed = signedLine(fence)
    const revealed = fence.tally !== undefined && selStart >= fence.from && selStart <= fence.to
    const slot = revealed && awaitsSign(fence)
    const raw = revealed && (signed || slot)
    intents.push({
      kind: 'line',
      from: ls,
      className: cx(
        'codeblock',
        fence.role === 'open' && 'codeblock-first',
        fence.role === 'close' && 'codeblock-last',
        fence.tally && 'codeblock-diff',
        fence.diff === 'head' && 'codeblock-diff-head',
        raw && 'codeblock-diff-raw',
      ),
    })
    pushPrefix(intents, ls, innerStart)
    if (barred(fence))
      intents.push({
        kind: 'lineWidget',
        from: ls,
        className: cx(
          'md-diff',
          `md-diff-${fence.diff}`,
          !barred(fences[i - 1]) && 'md-diff-first',
          !barred(fences[i + 1]) && 'md-diff-last',
        ),
      })
    // The sign is the line's own prefix: the caret floors past it as it does past a quote marker, and stays where the sign shows.
    if (signed) {
      pushPrefix(intents, innerStart, innerStart + 1, true)
      intents.push(
        raw
          ? { kind: 'class', from: innerStart, to: innerStart + 1, className: 'md-diff-sign' }
          : { kind: 'hide', from: innerStart, to: innerStart + 1 },
      )
    }
    // The offset comes from the fence grammar itself (markerEnd), so an indented or quoted fence never hides its own marker.
    const infoStart = ls + fence.markerEnd
    if (fence.role === 'open' && !caretOnLine) {
      intents.push({
        kind: 'codeTag',
        from: infoStart,
        name: fence.tally || fence.path ? undefined : fence.name,
        tally: fence.tally,
        path: fence.path,
      })
      if ((fence.name || fence.tally || fence.path) && infoStart < le)
        intents.push({ kind: 'hide', from: infoStart, to: le })
    }
    if (fence.ordinal !== undefined)
      intents.push({
        kind: 'lineWidget',
        from: ls,
        className: 'codeblock-line-number',
        text: String(fence.ordinal),
      })
    // While the caret reveals the block, a line anchors each seat that has nothing of its own to draw the caret against: the margin of a line with no sign, and the code of a line with none.
    const seat = innerStart + (signed ? 1 : 0)
    if (slot) intents.push({ kind: 'lineWidget', from: seat, className: 'md-diff-slot' })
    if (raw && seat === le)
      intents.push({ kind: 'lineWidget', from: seat, className: 'md-diff-code', side: 1 })
    return null
  }

  // Display math is formula source: a `- b` term must never become a bullet with a live drag glyph inside the formula.
  if (spanAt(scan.maths, ls) !== undefined) {
    pushPrefix(intents, ls, ls + base)
    return null
  }

  // A citation row returns like a fence line, so it never enters the list vocabulary; its label can never be revealed — a caret in five hidden characters would break it.
  if (i >= scan.citations.firstLine) {
    const entry = scan.citations.entryAt.get(i)
    if (!entry) return null
    const head = i === entry.line
    const contentStart = head ? entry.contentStart : ls
    intents.push({
      kind: 'line',
      from: ls,
      className: cx(
        head ? 'md-citation' : 'md-citation-continued',
        entry.ordinal === null && 'md-citation-dim',
      ),
    })
    if (head) {
      intents.push({
        kind: 'lineWidget',
        from: ls,
        className: 'md-citation-number',
        text: glyphOf(entry),
      })
      pushPrefix(intents, ls, contentStart)
    }
    if (contentStart < le)
      intents.push({ kind: 'class', from: contentStart, to: le, className: 'md-citation-text' })
    return null
  }

  for (const mk of scan.citations.markersAt.get(i) ?? []) {
    if (mk.ordinal === null) continue
    intents.push({
      kind: 'widget',
      from: mk.from,
      to: mk.to,
      spec: { type: 'citeRef', ordinal: mk.ordinal },
    })
    intents.push({ kind: 'atomic', from: mk.from, to: mk.to })
  }

  return base
}

export function lineIntentsInto(
  scan: DocScan,
  i: number,
  selStart: number,
  intents: DecoIntent[],
  scope: MarkdownScope,
  ranged = false,
): ListMarker | null {
  const line = scan.lines[i]
  const ls = scan.lineStarts[i]
  const le = ls + line.length
  let base = 0
  if (scope === 'page') {
    const chrome = pageChrome(scan, i, selStart, intents)
    if (chrome === null) return null
    base = chrome
  }

  const li = pushConstruct(intents, line, ls, base, selStart, scope, ranged)
  if (li) {
    const contentFrom = ls + base + li.contentStart
    if (contentFrom < le)
      intents.push({ kind: 'class', from: contentFrom, to: le, className: 'md-list-text' })
  }
  return li
}

export function railIntents(
  lineStarts: number[],
  listLevels: number[],
  listKinds: string[],
): RailIntent[][] {
  const rails: RailIntent[][] = new Array(listLevels.length)
  const railKind: string[] = []
  for (let i = 0; i < listLevels.length; i++) {
    const level = listLevels[i]
    if (level < 0) continue
    railKind[level] = listKinds[i]
    railKind.length = level + 1
    for (let k = 0; k < level; k++) {
      const typeClass = railKind[k]
      if (!typeClass) continue
      rails[i] ??= []
      rails[i].push({
        kind: 'rail',
        from: lineStarts[i],
        level: k,
        typeClass,
        first: i === 0 || listLevels[i - 1] <= k,
        last: i === listLevels.length - 1 || listLevels[i + 1] <= k,
      })
    }
  }
  return rails
}

interface CachedLineIntents {
  perLine: DecoIntent[][]
  /** Held apart from `perLine` because the lines a caret move re-derives would take a rail folded in there with them. */
  rails: RailIntent[][]
  listLevels: number[]
  listKinds: string[]
  fresh: [number, number][]
}

export const NO_CARET = -1

type LineFacts = Pick<CachedLineIntents, 'perLine' | 'listLevels' | 'listKinds'>

function deriveLines(
  facts: LineFacts,
  scan: DocScan,
  from: number,
  to: number,
  scope: MarkdownScope,
): void {
  for (let i = from; i < to; i++) {
    const out: DecoIntent[] = []
    const li = lineIntentsInto(scan, i, NO_CARET, out, scope)
    facts.perLine[i] = out
    facts.listLevels[i] = li ? li.level : -1
    facts.listKinds[i] = li ? (railTypeClass(li) ?? '') : ''
  }
}

function withRails(scan: DocScan, facts: LineFacts, fresh: [number, number][]): CachedLineIntents {
  return { ...facts, rails: railIntents(scan.lineStarts, facts.listLevels, facts.listKinds), fresh }
}

export function docLineIntents(scan: DocScan, scope: MarkdownScope = 'page'): CachedLineIntents {
  const n = scan.lines.length
  const facts: LineFacts = { perLine: [], listLevels: [], listKinds: [] }
  deriveLines(facts, scan, 0, n, scope)
  return withRails(scan, facts, [[0, n]])
}

const moveIntent = (it: DecoIntent, by: number): DecoIntent =>
  'to' in it ? { ...it, from: it.from + by, to: it.to + by } : { ...it, from: it.from + by }

export function stepLineIntents(
  prev: CachedLineIntents,
  was: DocScan,
  scan: DocScan,
  scope: MarkdownScope,
): CachedLineIntents {
  const [a, e] = scan.fresh
  const b = carriedFrom(was, scan)
  const shift = scan.text.length - was.text.length
  const carry = <T>(old: T[], move?: (v: T) => T): T[] =>
    old.slice(0, a).concat(new Array<T>(e - a), move ? old.slice(b).map(move) : old.slice(b))
  const facts: LineFacts = {
    perLine: carry(prev.perLine, (line) => line.map((it) => moveIntent(it, shift))),
    listLevels: carry(prev.listLevels),
    listKinds: carry(prev.listKinds),
  }
  deriveLines(facts, scan, a, e, scope)
  const fresh: [number, number][] = [[a, e]]
  if (scope === 'page')
    for (const [from, to] of citationLines(was, scan, a, e, b)) {
      deriveLines(facts, scan, from, to, scope)
      fresh.push([from, to])
    }
  return withRails(scan, facts, fresh)
}

function citationLines(
  was: DocScan,
  scan: DocScan,
  a: number,
  e: number,
  b: number,
): [number, number][] {
  const toNew = (k: number): number => (k < a ? k : k >= b ? k - b + e : a)
  const toOld = (k: number): number => (k < a ? k : k - e + b)
  const n = scan.lines.length
  const first = Math.min(toNew(was.citations.firstLine), scan.citations.firstLine)
  const ranges: [number, number][] = []
  if (first < a) ranges.push([first, a])
  if (Math.max(first, e) < n) ranges.push([Math.max(first, e), n])
  for (const [line, held] of scan.citations.markersAt) {
    if ((line >= a && line < e) || line >= first) continue
    const before = was.citations.markersAt.get(toOld(line))
    if (
      !before ||
      before.length !== held.length ||
      before.some((m, k) => m.ordinal !== held[k].ordinal)
    )
      ranges.push([line, line + 1])
  }
  return ranges
}

/** The lines a caret move re-derives: its own, or every line of the diff fence it sits in, whose signs it reveals at once. */
function liveLines(scan: DocScan, selStart: number): [number, number] {
  if (selStart < 0) return [NO_CARET, NO_CARET]
  const i = lineIndexAt(scan, selStart)
  const f = scan.fences[i]
  return f?.tally ? [lineIndexAt(scan, f.from), lineIndexAt(scan, f.to)] : [i, i]
}

/** `window` scopes only the copy — every intent was derived against the whole document, so no margin is owed. */
export function assembleLineIntents(
  scan: DocScan,
  cached: CachedLineIntents,
  selStart: number,
  window?: { from: number; to: number },
  scope: MarkdownScope = 'page',
  ranged = false,
): DecoIntent[] {
  const [top, bottom] = liveLines(scan, selStart)
  const first = window ? lineIndexAt(scan, window.from) : 0
  const last = window ? lineIndexAt(scan, window.to) : scan.lines.length - 1
  const intents: DecoIntent[] = []
  for (let i = first; i <= last; i++) {
    if (i >= top && i <= bottom) lineIntentsInto(scan, i, selStart, intents, scope, ranged)
    else for (const it of cached.perLine[i]) intents.push(it)
  }
  for (let i = first; i <= last; i++) {
    const rails = cached.rails[i]
    if (rails) for (const it of rails) intents.push(it)
  }
  return intents
}

export function prefixEndAt(cached: CachedLineIntents, scan: DocScan, pos: number): number {
  const i = lineIndexAt(scan, pos)
  let end = scan.lineStarts[i]
  for (let moved = true; moved; ) {
    moved = false
    for (const it of cached.perLine[i])
      if (it.kind === 'prefix' && it.from === end) {
        end = it.to
        moved = true
      }
  }
  return end
}

/** The seat a visible marker hands the caret: past its gap, where the content and any token opening it begin. A pointer landing at the marker's end sits before the zero-width gap, one seat short. */
export function seatPastMarker(
  cached: CachedLineIntents,
  scan: DocScan,
  pos: number,
  scope: MarkdownScope = 'page',
): number | null {
  const line = cached.perLine[lineIndexAt(scan, pos)]
  // A REPLACED marker — a bullet, a checkbox — draws nothing the caret can sit against, so a press at its start reveals the source instead of landing on the item.
  if (scope === 'cell') {
    let end = pos
    for (let moved = true; moved; ) {
      moved = false
      for (const it of line)
        if ((it.kind === 'atomic' || it.kind === 'prefix') && end >= it.from && end < it.to) {
          end = it.to
          moved = true
        }
    }
    if (end !== pos) return end
  }
  const marker = line.find((it) => it.kind === 'class' && it.className.includes(GLYPH_CLASS))
  if (marker?.kind !== 'class' || pos < marker.from || pos > marker.to) return null
  let end = marker.to
  for (const it of line)
    if (
      ((it.kind === 'class' && it.className === 'md-list-gap') || it.kind === 'hide') &&
      it.from === end &&
      it.to > end
    )
      end = it.to
  return end
}

function pushConstruct(
  intents: DecoIntent[],
  line: string,
  ls: number,
  base: number,
  selStart: number,
  scope: MarkdownScope,
  ranged: boolean,
): ListMarker | null {
  const inner = base === 0 ? line : line.slice(base)
  const innerStart = ls + base
  const le = ls + line.length
  const caretOnLine = selStart >= ls && selStart <= le
  const lm = readsLists(scope) ? parseListMarker(inner) : null
  const glyph = lm && listGlyphOf(lm)
  // Only a resting caret reveals the marker: a drag's head snapping across the atomic marker would otherwise swap glyph and source under the pointer on every move.
  const onMarker =
    !ranged &&
    lm !== null &&
    selStart >= innerStart + lm.markerStart &&
    selStart <= innerStart + lm.markerEnd

  const bulletAbsorbs = base > 0 && !onMarker && glyph === 'bullet'
  const hrAbsorbs = base > 0 && !caretOnLine && isThematicBreakLine(inner)
  // The prefix is hidden here so a leading widget can ABSORB it: CM drops a widget-replace that merely touches one.
  pushPrefix(intents, ls, innerStart, bulletAbsorbs || hrAbsorbs)

  if (scope === 'page' && isHeadingLine(inner)) {
    const hm = headingParts(inner)
    if (hm) {
      const level = hm.hashes.length
      const contentStart = innerStart + hm.contentStart
      intents.push({ kind: 'class', from: innerStart, to: le, className: `md-h${level}` })
      if (contentStart > innerStart)
        intents.push({
          kind: 'class',
          from: innerStart,
          to: contentStart,
          className: 'md-heading-marker',
        })
      if (!caretOnLine) intents.push({ kind: 'hide', from: innerStart, to: contentStart })
    }
  } else if (lm?.box && glyph === 'checkbox') {
    pushListLine(intents, ls, innerStart, lm)
    if (!onMarker) {
      intents.push({
        kind: 'hide',
        from: innerStart + lm.markerStart,
        to: innerStart + lm.box.start,
      })
      intents.push({
        kind: 'widget',
        from: innerStart + lm.box.start,
        to: innerStart + lm.box.end,
        spec: {
          type: 'checkbox',
          checked: lm.checked ?? false,
        },
      })
      intents.push({
        kind: 'hide',
        from: innerStart + lm.box.end,
        to: innerStart + lm.contentStart,
      })
      intents.push({
        kind: 'atomic',
        from: innerStart + lm.markerStart,
        to: innerStart + lm.contentStart,
      })
    }
    return lm
  } else if (lm && glyph === 'bullet') {
    // The replace runs THROUGH the marker-content gap, so neither a source tab nor pasted gap spaces occupy the in-flow slot; the visible gap is the glyph's CSS margin.
    intents.push({ kind: 'line', from: ls, className: listLineClass(lm), level: lm.level })
    if (onMarker) pushPrefix(intents, innerStart, innerStart + lm.markerStart)
    else {
      const slotStart = bulletAbsorbs ? ls : innerStart
      intents.push({
        kind: 'widget',
        from: slotStart,
        to: innerStart + lm.contentStart,
        spec: { type: 'bullet' },
      })
      if (innerStart + lm.markerStart > slotStart)
        intents.push({ kind: 'atomic', from: slotStart, to: innerStart + lm.markerStart })
      intents.push({
        kind: 'atomic',
        from: innerStart + lm.markerStart,
        to: innerStart + lm.contentStart,
      })
    }
    return lm
  } else if (lm && (glyph === 'arrow' || glyph === 'number')) {
    // Literal recolored source, no widget, so typing after the marker can't hit an atomic range.
    pushListLine(intents, ls, innerStart, lm)
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-list-${glyph} md-control ${GLYPH_CLASS}`,
    })
    pushMarkerGap(intents, innerStart + lm.markerEnd, innerStart + lm.contentStart, le)
    return lm
  } else if (scope === 'page' && isThematicBreakLine(inner) && !caretOnLine) {
    intents.push({
      kind: 'widget',
      from: hrAbsorbs ? ls : innerStart,
      to: le,
      spec: { type: 'hr' },
    })
  }
  return null
}
