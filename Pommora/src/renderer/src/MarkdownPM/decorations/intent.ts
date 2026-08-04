import type { Token, TokenKind } from '../tokens'
import {
  isThematicBreakLine,
  isHeadingLine,
  isBlockquoteLine,
  parseListMarker,
  blockquotePrefixRe,
  calloutLines,
  headingParts,
  scanFencedCode,
  splitWithOffsets,
  type CalloutLine,
  type FenceInfo,
  type ListMarker,
} from '../detect'
import { docMathRanges } from '../editor/mathRanges'

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

/** Every whole-doc scan the decoration pass reads — pure on `text`, so a caller that runs per
 *  keystroke/caret-move caches one per doc VERSION (docCache.docScan) instead of re-splitting and
 *  re-scanning the entire document on every rebuild. */
export interface DocScan {
  lines: string[]
  lineStarts: number[]
  fences: (FenceInfo | undefined)[]
  callouts: (CalloutLine | undefined)[]
  fencedRanges: [number, number][]
  maths: [number, number][]
}

export function scanDoc(text: string): DocScan {
  const { lines, lineStarts } = splitWithOffsets(text)
  const fences = scanFencedCode(lines, lineStarts)
  return {
    lines,
    lineStarts,
    fences,
    callouts: calloutLines(lines, fences),
    fencedRanges: fences.flatMap((f) => (f?.role === 'open' ? [[f.from, f.to] as [number, number]] : [])),
    maths: docMathRanges(text),
  }
}

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; bracketFrom: number; checked: boolean }

export type DecoIntent =
  | { kind: 'class'; from: number; to: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string }
  | { kind: 'line'; from: number; className: string; level?: number }
  | {
      kind: 'rail'
      from: number
      level: number
      typeClass: string
      first: boolean
      last: boolean
    }

// The outliner rail's x sits on its ANCESTOR's glyph centre, so its class tracks the ancestor marker's TYPE
// (--rail-x set in CSS per class) — a nested checkbox under a bullet parent gets the bullet centre, not its own.
// Scoped to dash-bullets and checkboxes; ordered / arrow / `+` return null (no rail) — their glyph-centre maths
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
  imageEmbed: 'md-image',
  inlineLatex: 'md-latex',
  blockLatex: 'md-latex',
}

export function decorationsFor(
  text: string,
  tokens: Token[],
  active: Set<number>,
  selStart: number,
  scan?: DocScan,
): DecoIntent[] {
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

  const { lines, lineStarts, fences, callouts, maths } = scan ?? scanDoc(text)

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
  const quoteChromeAt = (k: number): boolean => isBlockquoteLine(lines[k]) && !literalQuoteAt(k)

  // Per-line list nesting depth (-1 = not a rendered list line) + the rail type-class of the marker there.
  // Fed by pushConstruct's return; the outliner-rail pass below reads them to find run boundaries per level.
  const listLevels = new Array<number>(lines.length).fill(-1)
  const listKinds = new Array<string>(lines.length).fill('')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const ls = lineStarts[i]
    const le = ls + line.length

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
      if (qm && isBlockquoteLine(inner) && (fence === undefined || !fence.closed || fence.depth > 1)) {
        // first/last span the contiguous run of nested-quote lines (not a depth match — a run can vary in depth
        // yet flatten to one block), mirroring how the plain-quote branch tests its neighbours.
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
    } else if (!literalQuoteAt(i) && isBlockquoteLine(line)) {
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
      const caretInBlock = selStart >= fence.from && selStart <= fence.to
      intents.push({
        kind: 'line',
        from: ls,
        className: `md-cb${fence.role === 'open' ? ' md-cb-first' : ''}${fence.role === 'close' ? ' md-cb-last' : ''}`,
      })
      if (base > 0) intents.push({ kind: 'hide', from: ls, to: innerStart })
      if (fence.role !== 'content' && !caretInBlock)
        intents.push({ kind: 'hide', from: innerStart, to: le })
      continue
    }

    if (inMathLine(i)) {
      if (base > 0) intents.push({ kind: 'hide', from: ls, to: ls + base })
      continue
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
      listLevels[i] = li.level
      listKinds[i] = railTypeClass(li) ?? '' // "" = a rendered list line, but not a railed type
    }
  }

  // Outliner rails: one vertical guide per ANCESTOR level of each nested list line, each drawn as a continuous
  // run per level with rounded caps only at the run's two ends (mirrors the blockquote bar's first/last). A
  // level-K rail breaks wherever a neighbour's level ≤ K (or the neighbour isn't a list line). railKind tracks
  // the current ancestor's marker type at each level so the rail lands on THAT glyph's centre.
  const railKind: string[] = []
  for (let i = 0; i < lines.length; i++) {
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
        last: i === lines.length - 1 || listLevels[i + 1] <= k,
      })
    }
  }

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
    }
    return lm
  } else if (lm?.kind === 'arrow' || (lm?.kind === 'bullet' && lm.bullet === '+' && !lm.box)) {
    // `→` and `+` ARE their own glyphs, so they stay literal source (like the ordered number): recoloured +
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
    // `N.` stays literal recoloured source (no widget) so typing after the number can't hit an atomic range.
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
