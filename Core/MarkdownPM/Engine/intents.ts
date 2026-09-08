import type { Token, TokenKind } from './tokens'
import {
  isThematicBreakLine,
  isHeadingLine,
  isBlockquoteLine,
  parseListMarker,
  blockquotePrefixRe,
  headingParts,
  type CalloutLine,
  type CitationEntry,
  type ListMarker,
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

const glyphOf = (e: CitationEntry): string => (e.ordinal === null ? '–' : `${e.ordinal}.`)

export type WidgetSpec =
  | { type: 'hr' }
  | { type: 'bullet' }
  | { type: 'checkbox'; bracketFrom: number; checked: boolean }
  /** Drawn as the number its position earns rather than the label it holds — which is why it is a widget over hidden source and not a class on the source itself. */
  | { type: 'citeRef'; ordinal: number }

export type DecoIntent =
  | { kind: 'class'; from: number; to: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  /** Carried as its own intent rather than inferred from the replaces: a marker's slot is the run from its first character through the gap before its text, which no single replace spans. */
  | { kind: 'atomic'; from: number; to: number }
  | { kind: 'widget'; from: number; to: number; spec: WidgetSpec }
  | { kind: 'lineWidget'; from: number; className: string; text?: string }
  /** `name` is absent when the fence named none the roster answers to — the copy affordance the tag carries is the same either way. */
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

// The rail's x sits on its ANCESTOR's glyph center; ordered / arrow / `+` return null, so no rail is drawn under one.
function railTypeClass(m: ListMarker): string | null {
  if (m.kind === 'checkbox') return 'md-outline-task'
  if (m.kind === 'bullet' && m.bullet === '-') return 'md-outline-bullet'
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

  const quoteChromeAt = (k: number): boolean => scan.quotes[k] && !scan.literal[k]

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
        className: `md-blockquote-nested${first ? ' md-blockquote-nested-first' : ''}${last ? ' md-blockquote-nested-last' : ''}`,
      })
      // The bar is a real element so it sits OVER the fill with its own caps; a fill `::after` would clip one.
      intents.push({ kind: 'lineWidget', from: ls, className: 'md-blockquote-nested-bar' })
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

  // The prefix is hidden here so a leading widget can ABSORB it: CM drops a widget-replace that merely touches one.
  const li = pushConstruct(intents, line, ls, base, selStart)
  if (li) {
    const contentFrom = ls + base + li.contentStart
    if (contentFrom < le)
      intents.push({ kind: 'class', from: contentFrom, to: le, className: 'md-list-text' })
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

interface CachedLineIntents {
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
          className: 'md-heading-marker',
        })
      if (!caretOnLine) intents.push({ kind: 'hide', from: innerStart, to: contentStart })
    }
  } else if (lm?.kind === 'checkbox' && lm.box) {
    intents.push({
      kind: 'line',
      from: ls,
      className: `md-list-item md-list-task${lm.checked ? ' md-list-done' : ''}`,
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
    // The replace runs THROUGH the marker-content gap, so neither a source tab nor pasted gap spaces occupy the in-flow slot; the visible gap is the glyph's CSS margin.
    intents.push({ kind: 'line', from: ls, className: 'md-list-item', level: lm.level })
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
    intents.push({ kind: 'line', from: ls, className: 'md-list-item', level: lm.level })
    if (lm.markerStart > 0)
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-list-arrow md-control ${GLYPH_CLASS}`,
    })
    intents.push({
      kind: 'hide',
      from: innerStart + lm.markerEnd,
      to: innerStart + lm.contentStart,
    })
    return lm
  } else if (lm?.kind === 'ordered') {
    // Literal recolored source, no widget, so typing after the number can't hit an atomic range.
    intents.push({
      kind: 'line',
      from: ls,
      className: 'md-list-item md-list-ordered',
      level: lm.level,
    })
    if (lm.markerStart > 0)
      intents.push({ kind: 'hide', from: innerStart, to: innerStart + lm.markerStart })
    intents.push({
      kind: 'class',
      from: innerStart + lm.markerStart,
      to: innerStart + lm.markerEnd,
      className: `md-list-number md-control ${GLYPH_CLASS}`,
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
