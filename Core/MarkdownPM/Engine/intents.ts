import type { Token, TokenKind } from './tokens'
import {
  isThematicBreakLine,
  isHeadingLine,
  isBlockquoteLine,
  isSequenced,
  parseListMarker,
  blockquotePrefixRe,
  oneQuoteLevelRe,
  headingParts,
  type CalloutLine,
  type CitationEntry,
  type ListMarker,
  type MarkdownScope,
} from './detect'
import { codeLanguageName } from './codeLangs'
import { type DocScan, lineIndexAt, quotePrefixWidth, scanDoc } from './docScan'

function calloutNestedQuote(
  lines: string[],
  callouts: (CalloutLine | undefined)[],
  k: number,
): boolean {
  const co = k >= 0 && k < lines.length ? callouts[k] : undefined
  if (!co) return false
  const inner = lines[k].slice(co.prefixEnd)
  return blockquotePrefixRe.test(inner) && isBlockquoteLine(inner)
}

export const GLYPH_CLASS = 'md-list-glyph'

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

const glyphOf = (e: CitationEntry): string => (e.ordinal === null ? '–' : `${e.ordinal}.`)

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; bracketFrom: number; checked: boolean }
  | { type: 'citeRef'; ordinal: number }

export type RailIntent = {
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
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string; text?: string }
  | { kind: 'codeTag'; from: number; name?: string }
  | { kind: 'line'; from: number; className: string; level?: number }
  | RailIntent

// The rail's x sits on its ANCESTOR's glyph center; ordered / arrow / `+` return null, so no rail is drawn under one.
export function railTypeClass(m: ListMarker): string | null {
  if (m.kind === 'checkbox') return 'md-outline-task'
  if (m.kind === 'bullet' && m.bullet === '-') return 'md-outline-bullet'
  if (m.kind === 'alphabetical') return 'md-outline-alpha'
  return null
}

export const railClass = (r: Pick<RailIntent, 'typeClass' | 'first' | 'last'>): string =>
  `md-outline-rail ${r.typeClass}${r.first ? ' md-outline-first' : ''}${r.last ? ' md-outline-last' : ''}`

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
  if (lm.kind === 'checkbox') return `md-list-item md-list-task${lm.checked ? ' md-list-done' : ''}`
  return isSequenced(lm.kind) ? 'md-list-item md-list-ordered' : 'md-list-item'
}

export const CONTENT_CLASS: Partial<Record<TokenKind, string>> = {
  bold: 'md-bold',
  italic: 'md-italic',
  strikethrough: 'md-strike',
  inlineCode: 'md-code',
  highlight: 'md-highlight',
  embed: 'md-embed',
  inlineLatex: 'md-latex',
  blockLatex: 'md-latex',
}

export function tokenIntents(tokens: Token[], active: Set<number>): DecoIntent[] {
  const intents: DecoIntent[] = []
  tokens.forEach((tk, i) => {
    if (tk.kind === 'wikiLink' || tk.kind === 'link' || tk.kind === 'citationRef') return
    const cls = CONTENT_CLASS[tk.kind]
    if (cls)
      intents.push({
        kind: 'class',
        from: tk.contentRange[0],
        to: tk.contentRange[1],
        className: cls,
      })
    if (!active.has(i))
      for (const [s, e] of tk.markerRanges) intents.push({ kind: 'hide', from: s, to: e })
  })
  return intents
}

// Null where the line is chrome of its own and never enters the list vocabulary; otherwise the offset the list grammar starts at.
// A cell holds no box, no fence, no math and no citation row, and its own extension draws the footnote markers, so none of this is walked there.
function pageChrome(
  scan: DocScan,
  i: number,
  selStart: number,
  intents: DecoIntent[],
): number | null {
  const { lines, lineStarts, fences, callouts, maths } = scan
  const line = lines[i]
  const ls = lineStarts[i]
  const le = ls + line.length
  let base = 0
  // Display math is formula source: a `- b` term must never become a bullet with a live drag glyph inside the formula.
  const inMathLine = (k: number): boolean =>
    maths.some(([f, t]) => lineStarts[k] >= f && lineStarts[k] <= t)

  const quoteChromeAt = (k: number): boolean => scan.quotes[k] && !scan.literal[k]

  const fence = fences[i]
  const co = callouts[i]
  if (co) {
    intents.push({
      kind: 'line',
      from: ls,
      className: `md-callout${co.first ? ' md-callout-first' : ''}${co.last ? ' md-callout-last' : ''}`,
    })
    base = co.prefixEnd
    const inner = line.slice(base)
    const qm = blockquotePrefixRe.exec(inner)
    if (
      qm &&
      isBlockquoteLine(inner) &&
      (fence === undefined || !fence.closed || fence.depth > 1)
    ) {
      const first = !calloutNestedQuote(lines, callouts, i - 1)
      const last = !calloutNestedQuote(lines, callouts, i + 1)
      intents.push({
        kind: 'line',
        from: ls,
        className: `md-blockquote-nested${first ? ' md-blockquote-nested-first' : ''}${last ? ' md-blockquote-nested-last' : ''}`,
      })
      // The bar is a real element so it sits OVER the fill with its own caps; a fill `::after` would clip one.
      intents.push({ kind: 'lineWidget', from: ls, className: 'md-blockquote-nested-bar' })
      base += qm[0].length
    }
  } else if (quoteChromeAt(i)) {
    const full = blockquotePrefixRe.exec(line)
    const bm = full && line.slice(full[0].length).trim() === '' ? oneQuoteLevelRe.exec(line) : full
    if (bm) {
      const first = i === 0 || !quoteChromeAt(i - 1)
      const last = i === lines.length - 1 || !quoteChromeAt(i + 1)
      intents.push({
        kind: 'line',
        from: ls,
        className: `md-blockquote${first ? ' md-blockquote-first' : ''}${last ? ' md-blockquote-last' : ''}`,
      })
      base = bm[0].length
    }
  }

  if (fence) {
    if (fence.closed && base > 0) base = Math.min(base, quotePrefixWidth(line, fence.depth))
    const innerStart = ls + base
    const caretOnLine = selStart >= ls && selStart <= le
    intents.push({
      kind: 'line',
      from: ls,
      className: `codeblock${fence.role === 'open' ? ' codeblock-first' : ''}${fence.role === 'close' ? ' codeblock-last' : ''}`,
    })
    if (base > 0) intents.push({ kind: 'hide', from: ls, to: innerStart })
    // The offset comes from the fence grammar itself (markerEnd), so an indented or quoted fence never hides its own marker.
    const infoStart = ls + fence.markerEnd
    const named = fence.lang ? codeLanguageName(fence.lang) : null
    if (fence.role === 'open' && !caretOnLine) {
      intents.push({ kind: 'codeTag', from: infoStart, name: named ?? undefined })
      if (named && infoStart < le) intents.push({ kind: 'hide', from: infoStart, to: le })
    }
    if (fence.ordinal !== undefined)
      intents.push({
        kind: 'lineWidget',
        from: ls,
        className: 'codeblock-line-number',
        text: String(fence.ordinal),
      })
    return null
  }

  if (inMathLine(i)) {
    if (base > 0) intents.push({ kind: 'hide', from: ls, to: ls + base })
    return null
  }

  // A citation row returns like a fence line, so it never enters the list vocabulary; its label can never be revealed — a caret in five hidden characters would break it.
  if (scan.citations.mask[i]) {
    const entry = scan.citations.entryAt.get(i)
    if (!entry) return null
    const dim = entry.ordinal === null ? ' md-citation-dim' : ''
    const head = i === entry.line
    const contentStart = head ? entry.contentStart : ls
    intents.push({
      kind: 'line',
      from: ls,
      className: `${head ? 'md-citation' : 'md-citation-continued'}${dim}`,
    })
    if (head) {
      intents.push({
        kind: 'lineWidget',
        from: ls,
        className: 'md-citation-number',
        text: glyphOf(entry),
      })
      intents.push({ kind: 'hide', from: ls, to: contentStart })
      intents.push({ kind: 'atomic', from: ls, to: contentStart })
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
  }

  return base
}

function lineIntentsInto(
  scan: DocScan,
  i: number,
  selStart: number,
  intents: DecoIntent[],
  scope: MarkdownScope,
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

  const li = pushConstruct(intents, line, ls, base, selStart, scope)
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
  /** Held apart from `perLine` because the caret's own line re-derives, and a rail folded in there would go with it. */
  rails: RailIntent[][]
}

export const NO_CARET = -1

export function docLineIntents(scan: DocScan, scope: MarkdownScope = 'page'): CachedLineIntents {
  const n = scan.lines.length
  const perLine: DecoIntent[][] = new Array(n)
  const listLevels = new Array<number>(n).fill(-1)
  const listKinds = new Array<string>(n).fill('')
  for (let i = 0; i < n; i++) {
    perLine[i] = []
    const li = lineIntentsInto(scan, i, NO_CARET, perLine[i], scope)
    if (li) {
      listLevels[i] = li.level
      listKinds[i] = railTypeClass(li) ?? ''
    }
  }
  return { perLine, rails: railIntents(scan.lineStarts, listLevels, listKinds) }
}

function caretLine(scan: DocScan, selStart: number): number {
  return selStart < 0 ? NO_CARET : lineIndexAt(scan, selStart)
}

/** `window` scopes only the copy — every intent was derived against the whole document, so no margin is owed. */
export function assembleLineIntents(
  scan: DocScan,
  cached: CachedLineIntents,
  selStart: number,
  window?: { from: number; to: number },
  scope: MarkdownScope = 'page',
): DecoIntent[] {
  const caret = caretLine(scan, selStart)
  const first = window ? lineIndexAt(scan, window.from) : 0
  const last = window ? lineIndexAt(scan, window.to) : scan.lines.length - 1
  const intents: DecoIntent[] = []
  for (let i = first; i <= last; i++) {
    if (i === caret) lineIntentsInto(scan, i, selStart, intents, scope)
    else for (const it of cached.perLine[i]) intents.push(it)
  }
  for (let i = first; i <= last; i++) {
    const rails = cached.rails[i]
    if (rails) for (const it of rails) intents.push(it)
  }
  return intents
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
        if (it.kind === 'atomic' && end >= it.from && end < it.to) {
          end = it.to
          moved = true
        }
    }
    if (end !== pos) return end
  }
  const marker = line.find(
    (it) =>
      it.kind === 'class' &&
      (it.className.startsWith('md-list-number') || it.className.startsWith('md-list-arrow')),
  )
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

export function decorationsFor(
  text: string,
  tokens: Token[],
  active: Set<number>,
  selStart: number,
  scan?: DocScan,
  scope: MarkdownScope = 'page',
): DecoIntent[] {
  const s = scan ?? scanDoc(text)
  const intents: DecoIntent[] = tokenIntents(tokens, active)
  const n = s.lines.length
  const listLevels = new Array<number>(n).fill(-1)
  const listKinds = new Array<string>(n).fill('')
  for (let i = 0; i < n; i++) {
    const li = lineIntentsInto(s, i, selStart, intents, scope)
    if (li) {
      listLevels[i] = li.level
      listKinds[i] = railTypeClass(li) ?? ''
    }
  }
  for (const rails of railIntents(s.lineStarts, listLevels, listKinds))
    if (rails) for (const it of rails) intents.push(it)
  return intents
}

function pushConstruct(
  intents: DecoIntent[],
  line: string,
  ls: number,
  base: number,
  selStart: number,
  scope: MarkdownScope,
): ListMarker | null {
  const inner = base === 0 ? line : line.slice(base)
  const innerStart = ls + base
  const le = ls + line.length
  const caretOnLine = selStart >= ls && selStart <= le
  const lm = parseListMarker(inner)
  const glyph = lm && listGlyphOf(lm)
  const onMarker =
    lm !== null && selStart >= innerStart + lm.markerStart && selStart <= innerStart + lm.markerEnd

  const bulletAbsorbs = base > 0 && !onMarker && glyph === 'bullet'
  const hrAbsorbs = base > 0 && !caretOnLine && lm === null && isThematicBreakLine(inner)
  // The prefix is hidden here so a leading widget can ABSORB it: CM drops a widget-replace that merely touches one.
  if (base > 0 && !bulletAbsorbs && !hrAbsorbs)
    intents.push({ kind: 'hide', from: ls, to: innerStart })

  if (scope === 'page' && isHeadingLine(inner)) {
    const hm = headingParts(inner)
    if (hm) {
      const level = hm.hashes.length
      const contentStart = innerStart + hm.indent.length + hm.hashes.length + hm.space.length
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
    intents.push({
      kind: 'line',
      from: ls,
      className: listLineClass(lm),
      level: lm.level,
    })
    if (lm.markerStart > 0) {
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
      intents.push({ kind: 'atomic', from: innerStart, to: innerStart + lm.markerStart })
    }
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
          bracketFrom: innerStart + lm.box.start,
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
    if (onMarker) {
      if (lm.markerStart > 0)
        intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    } else {
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
  } else if (lm && glyph === 'arrow') {
    intents.push({ kind: 'line', from: ls, className: listLineClass(lm), level: lm.level })
    if (lm.markerStart > 0) {
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
      intents.push({ kind: 'atomic', from: innerStart, to: innerStart + lm.markerStart })
    }
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-list-arrow md-control ${GLYPH_CLASS}`,
    })
    pushMarkerGap(intents, innerStart + lm.markerEnd, innerStart + lm.contentStart, le)
    return lm
  } else if (lm && glyph === 'number') {
    // Literal recolored source, no widget, so typing after the marker can't hit an atomic range.
    intents.push({
      kind: 'line',
      from: ls,
      className: listLineClass(lm),
      level: lm.level,
    })
    if (lm.markerStart > 0) {
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
      intents.push({ kind: 'atomic', from: innerStart, to: innerStart + lm.markerStart })
    }
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-list-number md-control ${GLYPH_CLASS}`,
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
