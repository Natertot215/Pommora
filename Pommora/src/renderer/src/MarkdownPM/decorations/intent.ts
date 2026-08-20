import type { Token, TokenKind } from '../tokens'
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
  type CitationScan,
  type DocLines,
  type EmbedLine,
  type FenceInfo,
  type ListMarker,
  type WebpageLine,
} from '../detect'
import { docLineScan } from '../editor/embedRanges'
import { tableRegions, type TableRegion } from '../Tables/regions'

// A line is a nested quote INSIDE a callout when it's a callout line whose content (after the callout's own
// `>` level) is itself a blockquote. Drives the md-bq-in run's first/last across a contiguous nested-quote run.
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

// Width of the first `levels` quote levels (leading indent, then each `>` with its optional space) —
// inside a fence this is the chrome extent; anything past it is code bytes.
function quotePrefixWidth(line: string, levels: number): number {
  if (levels === 0) return 0
  let w = /^[ \t]*/.exec(line)?.[0].length ?? 0
  for (let k = 0; k < levels && line[w] === '>'; k++)
    w += line[w + 1] === ' ' || line[w + 1] === '\t' ? 2 : 1
  return w
}

// Shared marker class on all three list glyphs (bullet • / checkbox box / ordered number). The drag
// extension targets this one class, and `.md-li-glyph { cursor: pointer }` paints the pointer cursor —
// so any future list syntax that adopts it inherits both the cursor and drag-to-reorder for free.
export const GLYPH_CLASS = 'md-li-glyph'

/** Every whole-document derivation the editor reads — one split, one fence pass, one table pass,
 *  and the per-line block predicates answered once each. Pure on `text`, so a caller that runs per
 *  keystroke/caret-move caches one per doc VERSION (docCache.docScan) instead of re-splitting and
 *  re-scanning the entire document on every rebuild. */
export interface DocScan extends DocLines {
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  tables: TableRegion[]
  maths: [number, number][]
  embeds: EmbedLine[]
  webpages: WebpageLine[]
  citations: CitationScan
  /** Per line, in line order — the three block shapes whose test is a micromark parse. Answered
   *  once per line rather than on demand, which is what a blockquote line inside a rebuild would
   *  otherwise pay several times over. */
  headings: boolean[]
  quotes: boolean[]
  breaks: boolean[]
}

export function scanDoc(text: string): DocScan {
  const d = splitWithOffsets(text)
  const { lines, lineStarts } = d
  const fences = scanFencedCode(lines, lineStarts)
  const tables = tableRegions(d)
  return {
    ...d,
    fences,
    callouts: calloutLines(lines, fences),
    tables,
    ...docLineScan(d, fenceRangesOf(fences), tables),
    headings: lines.map(isHeadingLine),
    quotes: lines.map(isBlockquoteLine),
    breaks: lines.map(isThematicBreakLine),
  }
}

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; bracketFrom: number; checked: boolean }

export type DecoIntent =
  | { kind: 'class'; from: number; to: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  /** A span the caret must not enter, because a widget stands where its characters would be. Carried
   *  as its own intent rather than inferred from the replaces: a marker's slot is the run from its
   *  first character through the gap before its text, which no single replace spans. */
  | { kind: 'atomic'; from: number; to: number }
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string; text?: string }
  | { kind: 'line'; from: number; className: string; level?: number }
  | {
      kind: 'rail'
      from: number
      level: number
      typeClass: string
      first: boolean
      last: boolean
    }

// The outliner rail's x sits on its ANCESTOR's glyph center, so its class tracks the ancestor marker's TYPE
// (--rail-x set in CSS per class) — a nested checkbox under a bullet parent gets the bullet center, not its own.
// Scoped to dash-bullets and checkboxes; ordered / arrow / `+` return null (no rail) — their glyph-center maths
// is deferred, so a rail is only drawn under an ancestor that is one of the two supported types.
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
  embed: 'md-embed',
  inlineLatex: 'md-latex',
  blockLatex: 'md-latex',
}

/** The token-derived intents (content classes + marker hides for inactive tokens). Wiki links and
 *  external links stay out — decorations.ts renders those from resolution/validity. */
export function tokenIntents(tokens: Token[], active: Set<number>): DecoIntent[] {
  const intents: DecoIntent[] = []
  tokens.forEach((tk, i) => {
    if (tk.kind === 'wikiLink') return // resolution-dependent; rendered in decorations.ts by status
    if (tk.kind === 'link') return // validity-dependent; rendered in decorations.ts (valid vs invalid)
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

/** One line's intents, pushed into `intents`; returns the line's list marker (for the rail pass).
 *  `selStart` is the caret (or NO_CARET) — every caret-sensitive output is line-local: the line's
 *  own marker/heading/hr reveal, and an open fence's syntax-vs-glyph trade. */
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

  // A line inside a display-math span is formula source: box chrome still applies (boxes beat math,
  // as in the block model), but list/heading/hr constructs never render there — a `- b` term must not
  // become a bullet with a live drag glyph inside the formula.
  const inMathLine = (k: number): boolean =>
    maths.some(([f, t]) => lineStarts[k] >= f && lineStarts[k] <= t)

  // A line is literal code — content of a CLOSED unquoted fence — exactly when quote chrome must not
  // touch it. An unclosed fence claims every line to EOF while being typed, so it keeps chrome.
  const literalQuoteAt = (k: number): boolean => {
    const f = fences[k]
    return f?.closed === true && f.depth === 0
  }
  const quoteChromeAt = (k: number): boolean => scan.quotes[k] && !literalQuoteAt(k)

  // Box chrome (callout/quote) is independent of what's inside it: a `> - item` gets BOTH the box line-class
  // AND the bullet, a `> ```` code block keeps its box. `base` is where the inner content begins, so every
  // construct renders identically whether it's top-level or behind a `>` prefix. Inside a CLOSED fence,
  // chrome extends exactly to the fence's own quote depth — every `>` beyond it is code bytes.
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
    // A blockquote nested inside the callout (`> > …`): render the inner `>` as an inset quote block (indent
    // + bar + fill) rather than flattening it to plain callout body. first/last come from the quote depth.
    const inner = line.slice(base)
    const qm = blockquotePrefixRe.exec(inner) // all remaining `>` levels → one inset quote (depth flattens)
    // Inside a closed fence, an inset quote is chrome only if the fence itself was opened behind one
    // (depth ≥ 2 — callout level + inset level); a shallower fence's extra `>`s are code bytes.
    if (
      qm &&
      isBlockquoteLine(inner) &&
      (fence === undefined || !fence.closed || fence.depth > 1)
    ) {
      // first/last span the contiguous run of nested-quote lines (not a depth match — a run can vary in depth
      // yet flatten to one block), mirroring how the plain-quote branch tests its neighbors.
      const first = !calloutNestedQuote(lines, callouts, i - 1)
      const last = !calloutNestedQuote(lines, callouts, i + 1)
      intents.push({
        kind: 'line',
        from: ls,
        className: `md-bq-in${first ? ' md-bq-in-first' : ''}${last ? ' md-bq-in-last' : ''}`,
      })
      // The bar is a real element (a side widget) so it sits OVER the fill with its own rounded caps — a fill
      // `::after` can't carry both the bar's cap radius and its own without clipping one.
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
    // Code block (composes with box chrome). Only the fence's own quote depth hides as prefix
    // chrome — a deeper `>` run is code bytes and stays visible.
    if (fence.closed && base > 0) base = Math.min(base, quotePrefixWidth(line, fence.depth))
    const innerStart = ls + base
    const caretOnLine = selStart >= ls && selStart <= le
    intents.push({
      kind: 'line',
      from: ls,
      className: `md-cb${fence.role === 'open' ? ' md-cb-first' : ''}${fence.role === 'close' ? ' md-cb-last' : ''}`,
    })
    if (base > 0) intents.push({ kind: 'hide', from: ls, to: innerStart })
    // The backticks always show; a typed block trades only its info word for the styled `<TYPE>`
    // chrome, in the info word's own place — the caret on the line trades it back for the raw
    // text. The offset comes from the fence grammar itself (markerEnd), so an indented or quoted
    // fence never hides its own marker.
    const infoStart = ls + fence.markerEnd
    if (fence.role === 'open' && fence.lang && !caretOnLine && infoStart < le) {
      intents.push({
        kind: 'lineWidget',
        from: infoStart,
        className: 'md-cb-lang',
        text: fence.lang,
      })
      intents.push({ kind: 'hide', from: infoStart, to: le })
    }
    // Line-count chrome: every content line carries its number; the personalization root class
    // decides whether any of it renders.
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

  // pushConstruct hides the prefix [ls, innerStart] itself, so a leading bullet/HR widget can ABSORB it into
  // one replace — CM drops a widget-replace that merely *touches* a preceding replace at the same offset.
  const li = pushConstruct(intents, line, ls, base, selStart)
  if (li) {
    // The item's content wears md-li-text: the line itself suppresses every wrap opportunity (the
    // marker zone is full of them — spaces, a number's period, and the atomic cm-widgetBuffer imgs
    // CM plants beside every replace) and this span alone restores wrapping, so a long unbroken word
    // fills beside the glyph and breaks mid-word instead of dropping below the marker.
    const contentFrom = ls + base + li.contentStart
    if (contentFrom < le)
      intents.push({ kind: 'class', from: contentFrom, to: le, className: 'md-li-text' })
  }
  return li
}

// Outliner rails: one vertical guide per ANCESTOR level of each nested list line, each drawn as a continuous
// run per level with rounded caps only at the run's two ends (mirrors the blockquote bar's first/last). A
// level-K rail breaks wherever a neighbor's level ≤ K (or the neighbor isn't a list line). railKind tracks
// the current ancestor's marker type at each level so the rail lands on THAT glyph's center.
function railIntentsInto(
  lineStarts: number[],
  listLevels: number[],
  listKinds: string[],
  intents: DecoIntent[],
): void {
  const railKind: string[] = []
  for (let i = 0; i < listLevels.length; i++) {
    const level = listLevels[i]
    if (level < 0) continue
    railKind[level] = listKinds[i]
    railKind.length = level + 1
    for (let k = 0; k < level; k++) {
      const typeClass = railKind[k]
      if (!typeClass) continue // ancestor isn't a railed type (ordered / arrow / + — deferred)
      intents.push({
        kind: 'rail',
        from: lineStarts[i],
        level: k,
        typeClass,
        first: i === 0 || listLevels[i - 1] <= k,
        last: i === listLevels.length - 1 || listLevels[i + 1] <= k,
      })
    }
  }
}

/** The caret-free per-line intents + rails, cached per doc VERSION (docCache.docLineIntentsOf) — the
 *  caret contributes nothing here, so a caret move re-derives only its own affected lines. */
export interface CachedLineIntents {
  perLine: DecoIntent[][]
  rails: DecoIntent[]
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
      listKinds[i] = railTypeClass(li) ?? '' // "" = a rendered list line, but not a railed type
    }
  }
  const rails: DecoIntent[] = []
  railIntentsInto(scan.lineStarts, listLevels, listKinds, rails)
  return { perLine, rails }
}

/** The one line whose intents actually read the caret: the caret's own — every reveal (marker,
 *  heading, hr, and the fence lines' syntax-vs-glyph trade) is line-local. NO_CARET = none. */
function caretLine(scan: DocScan, selStart: number): number {
  if (selStart < 0) return NO_CARET
  const { lines, lineStarts } = scan
  let lo = 0
  let hi = lines.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= selStart) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The full line+rail intent list for a caret position, assembled from the cached caret-free lines
 *  with only the caret-affected lines re-derived. Rails never read the caret, so the cached set rides
 *  as-is (reveal never changes a line's list level). */
export function assembleLineIntents(
  scan: DocScan,
  cached: CachedLineIntents,
  selStart: number,
): DecoIntent[] {
  const caret = caretLine(scan, selStart)
  const intents: DecoIntent[] = []
  for (let i = 0; i < scan.lines.length; i++) {
    if (i === caret) lineIntentsInto(scan, i, selStart, intents)
    else for (const it of cached.perLine[i]) intents.push(it)
  }
  for (const it of cached.rails) intents.push(it)
  return intents
}

/** The pure whole-doc derivation — the reference the assembled path must match (see the equivalence
 *  pin). The live build path assembles from the per-version cache instead. */
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
  railIntentsInto(s.lineStarts, listLevels, listKinds, intents)
  return intents
}

// Reads the construct from `line.slice(base)` so it works identically top-level (base 0) or behind a
// `>`/callout prefix; offsets are absolute (`ls + base`), and the line-class attaches at `ls` to compose with box chrome.
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

  // A leading bullet/HR widget absorbs the box prefix into one replace (CM drops a widget-replace that just
  // touches a preceding replace). Otherwise hide the prefix separately so the `>`/`[!type]` never shows.
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
    // Raw `- [ ] ` shows only when the caret is on the marker; else a checkbox widget takes its slot.
    intents.push({ kind: 'line', from: ls, className: 'md-li md-li-task', level: lm.level })
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
    // Raw `-` shows only when the caret is on the marker (then the leading indent hides separately); else a
    // `•` widget takes the whole marker slot — leading indent THROUGH the marker-content gap (replace from
    // the line/box start) — so neither the source tab nor a pasted run of gap spaces occupies the in-flow
    // slot; the visible gap is the glyph's own CSS margin.
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
    // `→` and `+` ARE their own glyphs, so they stay literal source (like the ordered number): recolored +
    // given the drag-handle class, the gap hidden the way the ordered branch hides its own (the visible
    // gap is the glyph's CSS margin). Share the `.md-li` bullet zone.
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
    // `N.` stays literal recolored source (no widget) so typing after the number can't hit an atomic range.
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
    // Inside a box the HR widget swallows the prefix (same touching-replace reason as the bullet).
    intents.push({
      kind: 'widget',
      from: hrAbsorbs ? ls : innerStart,
      to: le,
      spec: { type: 'hr' },
    })
  }
  return null
}
