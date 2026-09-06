import type { Token, TokenKind } from '../Tokens'
import { codeMaskOf, isInsideInlineCode } from '@pommora/core/Connections/markdownCode'
import {
  isThematicBreakLine,
  isHeadingLine,
  isBlockquoteLine,
  parseListMarker,
  blockquotePrefixRe,
  calloutLines,
  fenceRangesOf,
  headingParts,
  scanFencedCode,
  splitWithOffsets,
  type CalloutLine,
  type CitationEntry,
  type DocLines,
  type FenceInfo,
  type ListMarker,
} from '../Detect'
import { codeLanguageName } from '../Detect/codeLangs'
import { docLineScan, type DocLineScan } from '../Editor/embedRanges'
import { tableRegions, type TableRegion } from '../Tables/regions'

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

function quotePrefixWidth(line: string, levels: number): number {
  if (levels === 0) return 0
  let w = /^[ \t]*/.exec(line)?.[0].length ?? 0
  for (let k = 0; k < levels && line[w] === '>'; k++)
    w += line[w + 1] === ' ' || line[w + 1] === '\t' ? 2 : 1
  return w
}

export const GLYPH_CLASS = 'md-li-glyph'

const glyphOf = (e: CitationEntry): string => (e.ordinal === null ? '–' : `${e.ordinal}.`)

/** Every whole-document derivation the editor reads. Pure on `text`, so per-keystroke callers cache one per doc VERSION. */
export interface DocScan extends DocLines, DocLineScan {
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  tables: TableRegion[]
  headings: boolean[]
  quotes: boolean[]
  breaks: boolean[]
}

export function scanDoc(text: string): DocScan {
  const d = splitWithOffsets(text)
  const { lines, lineStarts } = d
  const fences = scanFencedCode(lines, lineStarts)
  const inCode = codeMaskOf(lines, lineStarts, (i) => fences[i] !== undefined)
  const tables = tableRegions(d, inCode)
  return {
    ...d,
    fences,
    callouts: calloutLines(lines, fences),
    tables,
    ...docLineScan(d, fenceRangesOf(fences), tables, inCode),
    headings: lines.map(isHeadingLine),
    quotes: lines.map(isBlockquoteLine),
    breaks: lines.map(isThematicBreakLine),
  }
}

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; bracketFrom: number; checked: boolean }
  /** A body marker, drawn as the number its position earns rather than the label it holds — which
   *  is why it is a widget over hidden source and not a class on the source itself. */
  | { type: 'citeRef'; ordinal: number }

export type DecoIntent =
  | { kind: 'class'; from: number; to: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  /** A span the caret must not enter, because a widget stands where its characters would be. Carried
   *  as its own intent rather than inferred from the replaces: a marker's slot is the run from its
   *  first character through the gap before its text, which no single replace spans. */
  | { kind: 'atomic'; from: number; to: number }
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string; text?: string }
  /** A code block's top-right tag. `name` is the language it resolved to, absent when the fence
   *  named none the roster answers to — the copy affordance the tag carries is the same either way. */
  | { kind: 'codeTag'; from: number; name?: string }
  | { kind: 'line'; from: number; className: string; level?: number }
  | {
      kind: 'rail'
      from: number
      level: number
      typeClass: string
      first: boolean
      last: boolean
    }

export function codeBlockTextAt(scan: DocScan, pos: number): string {
  const start = lineIndexAt(scan, pos)
  const depth = scan.fences[start]?.depth ?? 0
  const out: string[] = []
  for (let i = start + 1; i < scan.lines.length; i++) {
    if (scan.fences[i]?.role !== 'content') break
    const line = scan.lines[i]
    out.push(line.slice(quotePrefixWidth(line, depth)))
  }
  return out.join('\n')
}

// The rail's x sits on its ANCESTOR's glyph center; ordered / arrow / `+` return null, so no rail is drawn under one.
function railTypeClass(m: ListMarker): string | null {
  if (m.kind === 'checkbox') return 'md-outliner-task'
  if (m.kind === 'bullet' && m.bullet === '-') return 'md-outliner-bullet'
  return null
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

function lineIntentsInto(
  scan: DocScan,
  i: number,
  selStart: number,
  intents: DecoIntent[],
): ListMarker | null {
  const { lines, lineStarts, fences, callouts, maths } = scan
  const line = lines[i]
  const ls = lineStarts[i]
  const le = ls + line.length

  // Display math is formula source: a `- b` term must never become a bullet with a live drag glyph inside the formula.
  const inMathLine = (k: number): boolean =>
    maths.some(([f, t]) => lineStarts[k] >= f && lineStarts[k] <= t)

  // An unclosed fence claims every line to EOF while being typed, so it keeps its quote chrome.
  const literalQuoteAt = (k: number): boolean => {
    const f = fences[k]
    return f?.closed === true && f.depth === 0
  }
  const quoteChromeAt = (k: number): boolean => scan.quotes[k] && !literalQuoteAt(k)

  // `base` is where the inner content begins, so a construct renders the same top-level or behind a `>`.
  const fence = fences[i]
  let base = 0
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
        className: `md-bq-in${first ? ' md-bq-in-first' : ''}${last ? ' md-bq-in-last' : ''}`,
      })
      // The bar is a real element so it sits OVER the fill with its own caps; a fill `::after` would clip one.
      intents.push({ kind: 'lineWidget', from: ls, className: 'md-bq-in-bar' })
      base += qm[0].length
    }
  } else if (quoteChromeAt(i)) {
    const bm = blockquotePrefixRe.exec(line)
    if (bm) {
      const first = i === 0 || !quoteChromeAt(i - 1)
      const last = i === lines.length - 1 || !quoteChromeAt(i + 1)
      intents.push({
        kind: 'line',
        from: ls,
        className: `md-bq${first ? ' md-bq-first' : ''}${last ? ' md-bq-last' : ''}`,
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
      className: `md-cb${fence.role === 'open' ? ' md-cb-first' : ''}${fence.role === 'close' ? ' md-cb-last' : ''}`,
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
        className: 'md-cb-ln',
        text: String(fence.ordinal),
      })
    return null
  }

  if (inMathLine(i)) {
    if (base > 0) intents.push({ kind: 'hide', from: ls, to: ls + base })
    return null
  }

  // A citation row returns like a fence line, so it never enters the list vocabulary; its label can never be
  // revealed — a caret in five hidden characters would break it.
  if (scan.citations.mask[i]) {
    const entry = scan.citations.entryAt.get(i)
    if (!entry) return null
    const dim = entry.ordinal === null ? ' md-cite-dim' : ''
    const head = i === entry.line
    const contentStart = head ? entry.contentStart : ls
    intents.push({
      kind: 'line',
      from: ls,
      className: `${head ? 'md-cite' : 'md-cite-cont'}${dim}`,
    })
    if (head) {
      intents.push({ kind: 'lineWidget', from: ls, className: 'md-cite-num', text: glyphOf(entry) })
      intents.push({ kind: 'hide', from: ls, to: contentStart })
      intents.push({ kind: 'atomic', from: ls, to: contentStart })
    }
    if (contentStart < le)
      intents.push({ kind: 'class', from: contentStart, to: le, className: 'md-cite-text' })
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

  // The prefix is hidden here so a leading widget can ABSORB it: CM drops a widget-replace that merely touches one.
  const li = pushConstruct(intents, line, ls, base, selStart)
  if (li) {
    const contentFrom = ls + base + li.contentStart
    if (contentFrom < le)
      intents.push({ kind: 'class', from: contentFrom, to: le, className: 'md-li-text' })
  }
  return li
}

function railIntents(
  lineStarts: number[],
  listLevels: number[],
  listKinds: string[],
): DecoIntent[][] {
  const rails: DecoIntent[][] = new Array(listLevels.length)
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

export interface CachedLineIntents {
  perLine: DecoIntent[][]
  /** Held apart from `perLine` because the caret's own line re-derives, and a rail folded in there would go with it. */
  rails: DecoIntent[][]
}

export const NO_CARET = -1

export function docLineIntents(scan: DocScan): CachedLineIntents {
  const n = scan.lines.length
  const perLine: DecoIntent[][] = new Array(n)
  const listLevels = new Array<number>(n).fill(-1)
  const listKinds = new Array<string>(n).fill('')
  for (let i = 0; i < n; i++) {
    perLine[i] = []
    const li = lineIntentsInto(scan, i, NO_CARET, perLine[i])
    if (li) {
      listLevels[i] = li.level
      listKinds[i] = railTypeClass(li) ?? ''
    }
  }
  return { perLine, rails: railIntents(scan.lineStarts, listLevels, listKinds) }
}

/** A position on a line's terminating newline belongs to that line, which puts an end-of-line caret where it looks. */
export function lineIndexAt(scan: DocScan, pos: number): number {
  const { lines, lineStarts } = scan
  let lo = 0
  let hi = lines.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Only the one line's spans are read; the string form re-splits and re-pairs from the top. */
export function inCodeAt(scan: DocScan, pos: number): boolean {
  if (pos < 0) return false
  const i = lineIndexAt(scan, pos)
  return scan.fences[i] !== undefined || isInsideInlineCode(scan.lines[i], pos - scan.lineStarts[i])
}

export function inCalloutAt(scan: DocScan, pos: number): boolean {
  if (pos < 0) return false
  return scan.callouts[lineIndexAt(scan, pos)] !== undefined
}

/** The caret's own line is the only one whose intents read it — every reveal is line-local. NO_CARET = none. */
function caretLine(scan: DocScan, selStart: number): number {
  return selStart < 0 ? NO_CARET : lineIndexAt(scan, selStart)
}

/** `window` scopes only the copy — every intent was derived against the whole document, so no margin is owed. */
export function assembleLineIntents(
  scan: DocScan,
  cached: CachedLineIntents,
  selStart: number,
  window?: { from: number; to: number },
): DecoIntent[] {
  const caret = caretLine(scan, selStart)
  const first = window ? lineIndexAt(scan, window.from) : 0
  const last = window ? lineIndexAt(scan, window.to) : scan.lines.length - 1
  const intents: DecoIntent[] = []
  for (let i = first; i <= last; i++) {
    if (i === caret) lineIntentsInto(scan, i, selStart, intents)
    else for (const it of cached.perLine[i]) intents.push(it)
  }
  for (let i = first; i <= last; i++) {
    const rails = cached.rails[i]
    if (rails) for (const it of rails) intents.push(it)
  }
  return intents
}

/** The reference the assembled path must match (the equivalence pin). The live build assembles from the cache. */
export function decorationsFor(
  text: string,
  tokens: Token[],
  active: Set<number>,
  selStart: number,
  scan?: DocScan,
): DecoIntent[] {
  const s = scan ?? scanDoc(text)
  const intents: DecoIntent[] = tokenIntents(tokens, active)
  const n = s.lines.length
  const listLevels = new Array<number>(n).fill(-1)
  const listKinds = new Array<string>(n).fill('')
  for (let i = 0; i < n; i++) {
    const li = lineIntentsInto(s, i, selStart, intents)
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
): ListMarker | null {
  const inner = base === 0 ? line : line.slice(base)
  const innerStart = ls + base
  const le = ls + line.length
  const caretOnLine = selStart >= ls && selStart <= le
  const lm = parseListMarker(inner)
  const onMarker =
    lm !== null && selStart >= innerStart + lm.markerStart && selStart <= innerStart + lm.markerEnd

  // A leading widget absorbs the box prefix into one replace; otherwise hide the prefix separately.
  const bulletAbsorbs =
    base > 0 && !onMarker && lm?.kind === 'bullet' && lm.bullet === '-' && !lm.box
  const hrAbsorbs = base > 0 && !caretOnLine && lm === null && isThematicBreakLine(inner)
  if (base > 0 && !bulletAbsorbs && !hrAbsorbs)
    intents.push({ kind: 'hide', from: ls, to: innerStart })

  if (isHeadingLine(inner)) {
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
          className: 'md-hmarker',
        })
      if (!caretOnLine) intents.push({ kind: 'hide', from: innerStart, to: contentStart })
    }
  } else if (lm?.kind === 'checkbox' && lm.box) {
    intents.push({
      kind: 'line',
      from: ls,
      className: `md-li md-li-task${lm.checked ? ' md-li-done' : ''}`,
      level: lm.level,
    })
    if (lm.markerStart > 0)
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
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
  } else if (lm?.kind === 'bullet' && lm.bullet === '-' && !lm.box) {
    // The replace runs THROUGH the marker-content gap, so neither a source tab nor pasted gap spaces
    // occupy the in-flow slot; the visible gap is the glyph's CSS margin.
    intents.push({ kind: 'line', from: ls, className: 'md-li', level: lm.level })
    if (onMarker) {
      if (lm.markerStart > 0)
        intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    } else {
      intents.push({
        kind: 'widget',
        from: bulletAbsorbs ? ls : innerStart,
        to: innerStart + lm.contentStart,
        spec: { type: 'bullet' },
      })
      intents.push({
        kind: 'atomic',
        from: innerStart + lm.markerStart,
        to: innerStart + lm.contentStart,
      })
    }
    return lm
  } else if (lm?.kind === 'arrow' || (lm?.kind === 'bullet' && lm.bullet === '+' && !lm.box)) {
    intents.push({ kind: 'line', from: ls, className: 'md-li', level: lm.level })
    if (lm.markerStart > 0)
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-li-mark md-control ${GLYPH_CLASS}`,
    })
    intents.push({
      kind: 'hide',
      from: innerStart + lm.markerEnd,
      to: innerStart + lm.contentStart,
    })
    return lm
  } else if (lm?.kind === 'ordered') {
    // Literal recolored source, no widget, so typing after the number can't hit an atomic range.
    intents.push({ kind: 'line', from: ls, className: 'md-li md-li-ordered', level: lm.level })
    if (lm.markerStart > 0)
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-ol-marker md-control ${GLYPH_CLASS}`,
    })
    intents.push({
      kind: 'hide',
      from: innerStart + lm.markerEnd,
      to: innerStart + lm.contentStart,
    })
    return lm
  } else if (isThematicBreakLine(inner) && !caretOnLine) {
    intents.push({
      kind: 'widget',
      from: hrAbsorbs ? ls : innerStart,
      to: le,
      spec: { type: 'hr' },
    })
  }
  return null
}
