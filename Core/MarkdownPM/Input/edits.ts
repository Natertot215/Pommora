import { type Personalization, settingOf } from '../../Settings/personalization'
import { linkDestinationStart } from '../../Connections/links'
import { type LinkSpans, linkOccurrences } from '../../Connections/connections'
import {
  inCalloutAt,
  inCodeAt,
  inCodeNear,
  inFenceAt,
  spanAt,
  type DocScan,
} from '../Engine/docScan'
import {
  fenceAt,
  isBlockquoteLine,
  lineEndOf,
  lineIndexAt,
  lineStartAt,
  lineEndAt,
  trimmedRange,
  quotePrefix,
  type TextEdit,
} from '../Engine/markdownCode'
import {
  parseListMarker,
  isSequenced,
  ordinalOf,
  ordinalText,
  MAX_NESTING_LEVEL,
  calloutHeadPrefixLen,
  headingParts,
  fenceBodyStart,
  signedLine,
  signKind,
  type ListMarker,
  type MarkdownScope,
  readsLists,
} from '../Engine/detect'
import { isColorMark, markAfter, markBefore } from '../Engine/highlightColors'
import { tokenize } from '../Engine/tokens'

// A transform reading more than its own line takes the caller's whole-document scan (one per doc version): the string-form code and callout tests re-split and re-pair every fence per call.

export interface Edit extends TextEdit {
  selection: number
  head?: number
  /** Writes list markers, so the runs it touches count again. */
  relist?: boolean
}

const shorthandCheckboxRe = /^([ \t]*)([-+])\[([ xX]?)\]$/

// A cell draws no quote, so a `>` there is prose and carries no prefix — otherwise the keys would nest inside a box the surface never shows.
const blockPrefix = (line: string, scope: MarkdownScope = 'page'): string =>
  scope === 'page' ? quotePrefix(line) : ''

// A fenced line is code, whatever its text looks like; a cell holds no fence, and the page-shaped scan would pair one there.
function listLineAt(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope,
): { ls: number; line: string; pfx: string; lm: ListMarker } | null {
  if (selStart !== selEnd) return null
  if (scope === 'page' && inFenceAt(scan, selStart)) return null
  const doc = scan.text
  const ls = lineStartAt(doc, selStart)
  const line = doc.slice(ls, lineEndAt(doc, selStart))
  const pfx = blockPrefix(line, scope)
  const lm = parseListMarker(line.slice(pfx.length))
  return lm === null ? null : { ls, line, pfx, lm }
}

export function continueListOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  const at = listLineAt(scan, selStart, selEnd, scope)
  if (at === null) return null
  const { ls, line, pfx, lm } = at
  if (selStart < ls + pfx.length + lm.contentStart) return null

  // Enter ALWAYS continues the list, even on an empty item — the exits are Shift+Enter and Backspace on the empty marker.
  const indent = line.slice(pfx.length, pfx.length + lm.markerStart)
  const next = isSequenced(lm.kind)
    ? `${ordinalText(lm.kind, ordinalOf(lm) + 1)}. `
    : lm.kind === 'checkbox'
      ? `${lm.bullet ?? '-'} [ ] `
      : `${lm.bullet ?? '-'} `
  const insert = `\n${pfx}${indent}${next}`
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length, relist: true }
}

export function continueBlockquoteOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
): Edit | null {
  if (selStart !== selEnd) return null
  const doc = scan.text
  const ls = lineStartAt(doc, selStart)
  const lineEnd = lineEndAt(doc, selStart)
  const pfx = blockPrefix(doc.slice(ls, lineEnd))
  if (pfx === '' || selStart < ls + pfx.length) return null
  // Callouts keep continuing — their documented exit is caret placement below the box, and stripping a body `> ` would split it.
  if (doc.slice(ls + pfx.length, lineEnd).trim() === '' && !inCalloutAt(scan, selStart)) {
    return { from: ls, to: lineEnd, insert: '', selection: ls }
  }
  const insert = `\n${pfx.replace(/[ \t]+$/, '')} `
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length }
}

export function calloutShorthand(
  doc: string,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== '|' || selStart !== selEnd || !settingOf(settings, 'transformCallouts'))
    return null
  const c = selStart
  const ls = lineStartAt(doc, c)
  if (ls !== c - 1 || doc[c - 1] !== '|') return null
  const lineEnd = lineEndAt(doc, c)
  const head = '> [!callout] '
  const onlyOnLine = c === lineEnd
  const prevIsQuote = ls > 0 && isBlockquoteLine(doc.slice(lineStartAt(doc, ls - 1), ls - 1))
  const nextStart = lineEnd + 1
  const nextIsQuote =
    nextStart <= doc.length && isBlockquoteLine(doc.slice(nextStart, lineEndAt(doc, nextStart)))
  const lead = prevIsQuote ? '\n' : ''
  const trailing = onlyOnLine && (lineEnd === doc.length || nextIsQuote) ? '\n' : ''
  const insert = lead + head + trailing
  return { from: ls, to: c, insert, selection: ls + lead.length + head.length }
}

export function shiftEnterEdit(scan: DocScan, selStart: number, selEnd: number): Edit {
  const doc = scan.text
  // A plain `\n` would drop an un-prefixed line into the run and split the callout. A selection straddling the box edge falls back to it.
  if (inCalloutAt(scan, selStart) && inCalloutAt(scan, selEnd)) {
    const ls = lineStartAt(doc, selStart)
    const pfx = blockPrefix(doc.slice(ls, lineEndAt(doc, selStart))).replace(/[ \t]+$/, '')
    const insert = `\n${pfx} `
    return { from: selStart, to: selEnd, insert, selection: selStart + insert.length }
  }
  // Inside a fence the break keeps the fence's quote or list indent, so it stays in the block; a diff line's sign stays behind, as a list item's marker does.
  const i = lineIndexAt(scan, selStart)
  const f = scan.fences[i]
  const lead = f?.role === 'content' ? scan.lines[i].slice(0, fenceBodyStart(scan.lines[i], f)) : ''
  const insert = `\n${lead}`
  return { from: selStart, to: selEnd, insert, selection: selStart + insert.length }
}

export function indentListOnTab(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  const at = listLineAt(scan, selStart, selEnd, scope)
  if (at === null || at.lm.level >= MAX_NESTING_LEVEL) return null
  const from = at.ls + at.pfx.length
  return { from, to: from, insert: '\t', selection: selStart + 1, relist: true }
}

export function outdentListOnShiftTab(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  const at = listLineAt(scan, selStart, selEnd, scope)
  if (at === null) return null
  const width = /^(?:\t| {1,2})/.exec(at.line.slice(at.pfx.length))?.[0].length
  if (width === undefined) return null
  const from = at.ls + at.pfx.length
  return {
    from,
    to: from + width,
    insert: '',
    selection: Math.max(from, selStart - width),
    relist: true,
  }
}

/** Where a Backspace takes a line's whole marker: a list marker is one unit, so a caret anywhere past its first character takes all of it rather than leaving a stray space or half a box; a heading or quote prefix only from its end. */
function markerSpanOf(line: string, scope: MarkdownScope): { from: number; to: number } | null {
  const lm = readsLists(scope) ? parseListMarker(line) : null
  if (lm) return { from: lm.markerStart + 1, to: lm.contentStart }
  if (scope !== 'page') return null
  const end = headingParts(line)?.contentStart ?? (quotePrefix(line).length || null)
  return end === null ? null : { from: end, to: end }
}

/** A diff line's margin takes only a sign, which replaces the one the line wears; the same sign again changes nothing. */
export function marginSign(scan: DocScan, seat: number, text: string): Edit | null {
  if (!signKind(text)) return null
  const signed = signedLine(scan.fences[lineIndexAt(scan, seat)])
  if (signed && scan.text[seat - 1] === text) return null
  return {
    from: signed ? seat - 1 : seat,
    to: seat,
    insert: text,
    selection: signed ? seat : seat + 1,
  }
}

export function smartBackspace(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (selStart !== selEnd) return null
  const doc = scan.text
  const ls = lineStartAt(doc, selStart)
  const line = doc.slice(ls, lineEndAt(doc, selStart))

  // A cell draws neither, so neither question applies there — and the scan, which is always page-shaped, would answer both wrongly.
  if (scope === 'page') {
    const fence = scan.fences[lineIndexAt(scan, selStart)]
    const body = fence ? ls + fenceBodyStart(line, fence) : ls
    if (body > ls && selStart === body && ls > 0)
      return { from: ls - 1, to: body, insert: '', selection: ls - 1 }
    // A fence holds literal text, so collapsing a marker there would eat characters the author typed as content.
    if (inCodeAt(scan, selStart)) return null

    // Inside a callout, never strip a lone `>` — that would drop the line out of the box, splitting it into a stray quote.
    if (inCalloutAt(scan, selStart)) {
      const pfx = blockPrefix(line)
      const headLen = calloutHeadPrefixLen(line)
      if (headLen !== null) {
        if (selStart > ls && selStart <= ls + headLen)
          return { from: ls, to: ls + headLen, insert: '', selection: ls }
        return null
      }
      const lm = parseListMarker(line.slice(pfx.length))
      if (lm) {
        const innerContentStart = ls + pfx.length + lm.contentStart
        if (selStart <= ls + pfx.length + lm.markerStart || selStart > innerContentStart)
          return null
        return {
          from: ls + pfx.length,
          to: innerContentStart,
          insert: '',
          selection: ls + pfx.length,
        }
      }
      if (selStart === ls + pfx.length && ls > 0)
        return { from: ls - 1, to: ls + pfx.length, insert: '', selection: ls - 1 }
      return null
    }
  }

  const marker = markerSpanOf(line, scope)
  if (marker === null || selStart < ls + marker.from || selStart > ls + marker.to) return null
  return { from: ls, to: ls + marker.to, insert: '', selection: ls }
}

export function canonicalizeCheckbox(
  doc: string,
  selStart: number,
  selEnd: number,
  inserted: string,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (inserted !== ' ' || selStart !== selEnd || !readsLists(scope)) return null
  const ls = lineStartAt(doc, selStart)
  const before = doc.slice(ls, selStart)
  const pfx = blockPrefix(before, scope)
  const m = shorthandCheckboxRe.exec(before.slice(pfx.length))
  if (m === null) return null
  const [, ws, marker, inner] = m
  // The trailing space is the task-list grammar's own requirement, not decoration: without it the line parses as plain text.
  const gfm = `${ws}${marker} [${inner.toLowerCase() === 'x' ? 'x' : ' '}] `
  return {
    from: ls + pfx.length,
    to: selStart,
    insert: gfm,
    selection: ls + pfx.length + gfm.length,
  }
}

interface PairSpec {
  close: string
  multi?: string
  group: 'pairBrackets' | 'pairMarkers' | 'pairQuotes'
}
const PAIRS: Record<string, PairSpec> = {
  '*': { close: '*', multi: '**', group: 'pairMarkers' },
  '~': { close: '~', multi: '~~', group: 'pairMarkers' },
  '=': { close: '=', multi: '==', group: 'pairMarkers' },
  _: { close: '_', multi: '__', group: 'pairMarkers' },
  '`': { close: '`', group: 'pairMarkers' },
  '(': { close: ')', multi: '))', group: 'pairBrackets' },
  '[': { close: ']', multi: ']]', group: 'pairBrackets' },
  '{': { close: '}', multi: '}}', group: 'pairBrackets' },
  '"': { close: '"', group: 'pairQuotes' },
  "'": { close: "'", group: 'pairQuotes' },
}

const DOUBLED_ONLY = new Set(['~', '='])
const OPEN_MARKS = new Set(Object.keys(PAIRS))
const CLOSE_MARKS = new Set(Object.values(PAIRS).map((p) => p.close))
const isPairEdge = (ch: string | undefined, marks: Set<string>): boolean =>
  ch === undefined || /\s/.test(ch) || marks.has(ch)

const runEndAt = (doc: string, c: number): number => {
  let end = c
  while (end < doc.length && doc[end] === doc[c]) end++
  return end
}

const emptyPairAt = (doc: string, c: number): boolean => {
  const ch = doc[c]
  if (ch === undefined) return false
  let start = c
  while (doc[start - 1] === ch) start--
  const end = runEndAt(doc, c)
  return (
    c - start === end - c &&
    isPairEdge(doc[start - 1], OPEN_MARKS) &&
    isPairEdge(doc[end], CLOSE_MARKS)
  )
}

/** The connection written around `at` as the editor draws it, so code touching it leaves none; its spans are relative to `at`'s line, empty slots kept. */
export function connectionAt(scan: DocScan, at: number): LinkSpans | null {
  const i = lineIndexAt(scan, at)
  const line = scan.lines[i]
  if (!line.includes('[[')) return null
  const ls = scan.lineStarts[i]
  for (const o of linkOccurrences(line, (p) => inCodeAt(scan, ls + p)))
    if (o.syntax === 'wiki' && at - ls >= o.full[0] && at - ls <= o.full[1]) return o
  return null
}

export function openConnectionAt(scan: DocScan, at: number): LinkSpans | null {
  const i = lineIndexAt(scan, at)
  const ls = scan.lineStarts[i]
  const head = scan.lines[i].slice(0, at - ls)
  if (!head.includes('[[')) return null
  if (head.endsWith('[[')) {
    const rel = head.length
    return { full: [rel - 2, rel], title: [rel, rel], heading: null, alias: null }
  }
  const closed = `${head}]]`
  for (const o of linkOccurrences(closed, (p) => inCodeAt(scan, ls + p)))
    if (o.syntax === 'wiki' && o.full[1] === closed.length)
      return { ...o, full: [o.full[0], head.length] }
  return null
}

/** In a written connection's alias, where a `]` would truncate the link. */
export function inAliasAt(scan: DocScan, at: number): boolean {
  const alias = connectionAt(scan, at)?.alias
  const rel = at - lineStartAt(scan.text, at)
  return alias != null && rel >= alias[0] && rel <= alias[1]
}

export function autoPair(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd) return null
  const doc = scan.text
  const c = selStart
  if (')]}'.includes(inserted) && doc[c] === inserted && settingOf(settings, 'pairBrackets'))
    return inCodeAt(scan, c) ? null : { from: c, to: c, insert: '', selection: c + 1 }
  const pair = PAIRS[inserted]
  if (!pair || !settingOf(settings, pair.group) || !isPairEdge(doc[c], CLOSE_MARKS)) return null
  if (inCodeAt(scan, c)) return null
  const prev = doc[c - 1]

  if (pair.multi && prev === inserted) {
    const opensEmpty =
      pair.close === inserted
        ? emptyPairAt(doc, c)
        : doc[c] === pair.close && isPairEdge(doc[c - 2], OPEN_MARKS)
    if (opensEmpty) return { from: c, to: c, insert: inserted + pair.close, selection: c + 1 }
    if (doc[c] === inserted) return { from: c, to: c, insert: '', selection: c + 1 }
    // A doubled marker only pairs as a fresh OPENER — not glued to a word, and not completing an earlier unmatched double.
    const beforeRun = doc.slice(lineStartAt(doc, c), c - 1)
    const openDoubles = beforeRun.split(inserted + inserted).length - 1
    const glued = doc[c - 2] !== undefined && /\w/.test(doc[c - 2])
    if (glued || openDoubles % 2 === 1) return null
    return { from: c, to: c, insert: inserted + pair.multi, selection: c + 1 }
  }
  if (doc[c] === inserted && pair.close === inserted && !isWordCh(doc[runEndAt(doc, c)]))
    return { from: c, to: c, insert: '', selection: c + 1 }
  if (DOUBLED_ONLY.has(inserted)) return null
  if (!isPairEdge(prev, OPEN_MARKS) && !(inserted === '(' && prev === ']')) return null
  if (inserted === '[' && inAliasAt(scan, c)) return null
  return { from: c, to: c, insert: inserted + pair.close, selection: c + 1 }
}

export function pairColorMark(
  scan: DocScan,
  c: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (!isColorMark(inserted) || !settingOf(settings, 'pairMarkers') || inCodeAt(scan, c))
    return null
  const doc = scan.text
  if (doc.slice(c - 2, c) !== '==' || doc[c - 3] === '=') return null
  const close = emptyPairAt(doc, c) ? c : highlightCloseAt(doc, c - 2)
  if (close === null) return null
  return {
    from: c,
    to: close,
    insert: inserted + doc.slice(c, close) + inserted,
    selection: c + inserted.length,
  }
}

/** Where the uncolored highlight opening at `open` starts its closing `==`. */
function highlightCloseAt(doc: string, open: number): number | null {
  const ls = lineStartAt(doc, open)
  const tk = tokenize(doc.slice(ls, lineEndAt(doc, open))).find(
    (tk) => tk.kind === 'highlight' && !tk.color && tk.range[0] === open - ls,
  )
  return tk ? ls + tk.range[1] - 2 : null
}

// A wrap over a selection already wrapped by its own cycle steps to the next wrapper instead of compounding; '' unwraps, and a cycle without it loops.
const WRAP_CYCLES: Record<string, string[]> = {
  '[': ['[', '[[', '{', '{{'],
  '"': ['"', "'", ''],
  ...Object.fromEntries(['*', '~', '=', '_', '`'].map((m) => [m, [m, m + m, '']])),
}
const CYCLE_ENTRY: Record<string, string> = { '{': '[', "'": '"' }
const closeOf = (wrapper: string): string =>
  [...wrapper]
    .reverse()
    .map((ch) => PAIRS[ch].close)
    .join('')
const wrappedBy = (doc: string, from: number, to: number, wrapper: string): boolean =>
  wrapper !== '' &&
  from >= wrapper.length &&
  doc.startsWith(wrapper, from - wrapper.length) &&
  doc.startsWith(closeOf(wrapper), to) &&
  !isWordCh(doc[from - wrapper.length - 1]) &&
  !isWordCh(doc[to + wrapper.length])

export function wrapSelection(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  const open = CYCLE_ENTRY[inserted] ?? inserted
  const pair = PAIRS[open]
  if (!pair || selStart === selEnd || !settingOf(settings, 'wrapSelections')) return null
  const doc = scan.text
  const [from, to] = trimmedRange(doc, selStart, selEnd)
  const cycle = WRAP_CYCLES[open] ?? []
  const outer =
    [...cycle].sort((a, b) => b.length - a.length).find((w) => wrappedBy(doc, from, to, w)) ?? ''
  const start = from - outer.length
  const end = to + outer.length
  if (!settingOf(settings, pair.group) || inCodeAt(scan, start) || inCodeAt(scan, end)) return null
  const text = doc.slice(from, to)
  if (pair.group === 'pairMarkers' && text.includes('\n')) return null
  const next = outer ? cycle[(cycle.indexOf(outer) + 1) % cycle.length] : open
  return {
    from: start,
    to: end,
    insert: next + text + closeOf(next),
    selection: start + next.length,
    head: start + next.length + text.length,
  }
}

export function autoDelete(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  settings: Personalization = {},
): Edit | null {
  if (!settingOf(settings, 'deletePairsTogether')) return null
  if (selStart !== selEnd || selStart === 0 || inCodeAt(scan, selStart)) return null
  const doc = scan.text
  const before = markBefore(doc, selStart)
  const after = markAfter(doc, selStart)
  if (before && before.color === after?.color) {
    const from = selStart - before.length
    const to = selStart + after.length
    if (doc.slice(from - 2, from) === '==' && highlightCloseAt(doc, from - 2) === to)
      return { from, to, insert: '', selection: from }
  }
  const close = PAIRS[doc[selStart - 1]]?.close
  if (close === undefined || doc[selStart] !== close) return null
  if (close === doc[selStart - 1] && !emptyPairAt(doc, selStart)) return null
  return { from: selStart - 1, to: selStart + 1, insert: '', selection: selStart - 1 }
}

const CLOSERS: readonly { close: string; open: string }[] = [
  { close: ']]', open: '[[' },
  { close: '}}', open: '{{' },
  { close: '**', open: '**' },
  { close: '__', open: '__' },
  { close: '``', open: '``' },
  { close: '~~', open: '~~' },
  { close: '==', open: '==' },
  { close: ']', open: '[' },
  { close: ')', open: '(' },
  { close: '}', open: '{' },
  { close: '"', open: '"' },
  { close: "'", open: "'" },
  { close: '*', open: '*' },
  { close: '_', open: '_' },
  { close: '`', open: '`' },
]

const isWordCh = (ch: string | undefined): boolean => ch !== undefined && /\w/.test(ch)

function closerEndAt(scan: DocScan, caret: number): number | null {
  if (inCodeAt(scan, caret)) return null
  const doc = scan.text
  // A highlight's closing color mark is part of its closer.
  const mark = markAfter(doc, caret)
  const c = mark && doc.startsWith('==', caret + mark.length) ? caret + mark.length : caret
  const before = doc.slice(lineStartAt(doc, c), c)
  // A single-char symmetric marker flanked by word chars is prose — contractions would poison the parity and teleport the caret.
  const count = (s: string): number => {
    if (s.length > 1) return before.split(s).length - 1
    let n = 0
    for (let i = before.indexOf(s); i !== -1; i = before.indexOf(s, i + 1)) {
      if (!(isWordCh(before[i - 1]) && isWordCh(before[i + 1] ?? doc[c]))) n++
    }
    return n
  }
  for (const { close, open } of CLOSERS) {
    if (!doc.startsWith(close, c)) continue
    if (close.length === 1 && open === close && isWordCh(doc[c - 1]) && isWordCh(doc[c + 1]))
      continue
    // Symmetric markers count parity; asymmetric ones compare opens to closes, or `**a**|**b**` false-positives.
    const inside = open === close ? count(open) % 2 === 1 : count(open) > count(close)
    if (!inside) continue
    return open === close && PAIRS[open[0]].group === 'pairMarkers'
      ? runEndAt(doc, c)
      : c + close.length
  }
  return null
}

export function closeConstructOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd || !settingOf(settings, 'exitPairsOnEnter')) return null
  const end = closerEndAt(scan, selStart)
  return end === null ? null : { from: selStart, to: selStart, insert: '', selection: end }
}

function blockCloser(
  scan: DocScan,
  i: number,
  typed: boolean,
): { prefix: string; closer: string } | null {
  const line = scan.lines[i]
  if (line.trim() === '$$') {
    const at = scan.lineStarts[i]
    const math = spanAt(scan.maths, at)
    if (
      scan.fences[i] !== undefined ||
      spanAt(scan.tables, at) !== undefined ||
      (math !== undefined && math[0] !== at)
    )
      return null
    if (scan.mathOpen !== i && !(typed && scan.mathOpen > i)) return null
    const prefix = line.slice(0, line.search(/\S/))
    return { prefix, closer: `${prefix}$$` }
  }
  const own = fenceAt(line)
  const f = scan.fences[i]
  if (own === null || (f !== undefined && (f.role !== 'open' || !typed))) return null
  if (f !== undefined) {
    const last = lineIndexAt(scan, f.to)
    const captured = scan.fenceLines.some((k) => {
      const g = k > i && k < last ? fenceAt(scan.lines[k]) : null
      return (
        g !== null && g.marker === own.marker && g.depth === own.depth && g.length >= own.length
      )
    })
    const next = scan.fenceLines.find((k) => k > last)
    if (!captured && (next === undefined || scan.fences[next] !== undefined)) return null
  }
  const prefix = line.slice(0, own.markerEnd - own.length)
  return { prefix, closer: prefix + own.marker.repeat(own.length) }
}

export function closeBlockOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  settings: Personalization,
  typed: boolean,
): Edit | null {
  if (selStart !== selEnd || !settingOf(settings, 'pairMarkers')) return null
  const i = lineIndexAt(scan, selStart)
  const end = lineEndOf(scan, i)
  if (selStart !== end) return null
  const block = blockCloser(scan, i, typed)
  if (block === null) return null
  return {
    from: end,
    to: end,
    insert: `\n${block.prefix}\n${block.closer}`,
    selection: end + 1 + block.prefix.length,
  }
}

export function closeConstructOnShiftEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd || !settingOf(settings, 'exitPairsOnEnter')) return null
  const end = closerEndAt(scan, selStart)
  return end === null ? null : shiftEnterEdit(scan, end, end)
}

// A URL-shaped run or a link address the caret sits in is link content: converting `--` → `—` would corrupt the path.
const urlRunRe = /(?:^|[\s([{<"'])[a-z][a-z0-9+.-]*:\/\/\S*$/i
const inUrlRun = (doc: string, c: number): boolean => {
  const from = lineStartAt(doc, c)
  return (
    urlRunRe.test(doc.slice(from, c)) ||
    linkDestinationStart(doc.slice(from, lineEndAt(doc, c)), c - from) !== null
  )
}
const isLiteralAt = (scan: DocScan, c: number): boolean =>
  inCodeNear(scan, c) ||
  spanAt(scan.maths, c) !== undefined ||
  openConnectionAt(scan, c) !== null ||
  inUrlRun(scan.text, c)

// An unclosed `[` holds a citation's label or a link's text: a glyph written there lands inside the reference.
export const inBracket = (doc: string, c: number): boolean => {
  const line = doc.slice(lineStartAt(doc, c), c)
  const open = line.lastIndexOf('[')
  return open !== -1 && !line.slice(open).includes(']')
}

const lineBodyBefore = (doc: string, pos: number): string => {
  const ls = lineStartAt(doc, pos)
  return doc.slice(ls + blockPrefix(doc.slice(ls, lineEndAt(doc, pos))).length, pos)
}

const opensLine = (doc: string, pos: number): boolean => {
  const before = doc.slice(lineStartAt(doc, pos), pos)
  return before.slice(blockPrefix(before).length).trim() === ''
}

export function ellipsis(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== '.' || selStart !== selEnd || !settingOf(settings, 'transformEllipses'))
    return null
  const doc = scan.text
  const c = selStart
  if (doc[c - 1] !== '.' || doc[c - 2] !== '.' || doc[c - 3] === '.' || isLiteralAt(scan, c))
    return null
  return { from: c - 2, to: c, insert: '…', selection: c - 1 }
}

export function sectionSign(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== '#' || selStart !== selEnd || !settingOf(settings, 'transformSections'))
    return null
  const doc = scan.text
  const c = selStart
  if (doc[c - 1] !== '#' || doc[c - 2] === '#') return null
  if (opensLine(doc, c - 1) || isLiteralAt(scan, c) || inBracket(doc, c)) return null
  return { from: c - 1, to: c, insert: '§', selection: c }
}

export function bullet(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== ' ' || selStart !== selEnd || !settingOf(settings, 'transformBullets'))
    return null
  const doc = scan.text
  const c = selStart
  if (c < 2 || doc[c - 1] !== '^' || doc[c - 2] !== ' ') return null
  if (isLiteralAt(scan, c) || inBracket(doc, c) || !/\S/.test(lineBodyBefore(doc, c - 2)))
    return null
  return { from: c - 1, to: c, insert: '• ', selection: c + 1 }
}

const PUNCTUATION: Record<string, string> = {
  '!!': '‼',
  '??': '⁇',
  '?!': '⁈',
  '!?': '⁉',
  '||': '‖',
}
const PAIR_OF = Object.fromEntries(Object.entries(PUNCTUATION).map(([pair, g]) => [g, pair]))

// A third mark expands the glyph back to its pair, so a longer run such as `???` stays literal.
export function punctuation(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd || !settingOf(settings, 'transformPunctuation')) return null
  const doc = scan.text
  const c = selStart
  const pair = PAIR_OF[doc[c - 1]]
  if (pair && PUNCTUATION[pair[1] + inserted])
    return { from: c - 1, to: c, insert: pair + inserted, selection: c + 2 }
  const glyph = PUNCTUATION[doc[c - 1] + inserted]
  if (!glyph || PUNCTUATION[doc.slice(c - 2, c)] || isLiteralAt(scan, c)) return null
  if (glyph === '‖') {
    const before = lineBodyBefore(doc, c - 1)
    if (!/\S/.test(before) || before.includes('|')) return null
  }
  return { from: c - 1, to: c, insert: glyph, selection: c }
}

const EQUATIONS: Record<string, string> = {
  '>=': '≥',
  '<=': '≤',
  '!=': '≠',
  '/=': '≠',
  '=/': '≠',
  '+-': '±',
  '-+': '±',
  '~=': '≈',
  '=~': '≈',
}

export function equations(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd || !settingOf(settings, 'transformEquations')) return null
  const doc = scan.text
  const c = selStart
  const glyph = EQUATIONS[`${doc[c - 1]}${inserted}`]
  if (!glyph || doc[c - 2] === doc[c - 1] || isLiteralAt(scan, c)) return null
  if ((doc[c - 1] === '/' || inserted === '/') && /\w/.test(doc[c - 2] ?? '')) return null
  return { from: c - 1, to: c, insert: glyph, selection: c }
}

export function dashArrow(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (selStart !== selEnd || inserted.length !== 1) return null
  const doc = scan.text
  const c = selStart
  if (!'-–←><'.includes(doc[c - 1]) || isLiteralAt(scan, c)) return null
  const dashes = settingOf(settings, 'transformDashes')
  const arrows = settingOf(settings, 'transformArrows')

  if (
    dashes &&
    inserted !== '-' &&
    inserted !== '>' &&
    c >= 2 &&
    doc[c - 1] === '-' &&
    doc[c - 2] === '-' &&
    doc[c - 3] !== '-' &&
    doc[c - 3] !== '!'
  )
    return { from: c - 2, to: c, insert: `—${inserted}`, selection: c }
  if (dashes && inserted === '-' && doc[c - 1] === '–')
    return { from: c - 1, to: c, insert: '—', selection: c }
  if (inserted === '>') {
    if (arrows && doc[c - 1] === '←') return { from: c - 1, to: c, insert: '↔', selection: c }
    if (doc[c - 1] === '-' && doc[c - 2] !== '-' && (arrows || opensLine(doc, c - 1)))
      return { from: c - 1, to: c, insert: '→', selection: c }
    if (arrows && doc[c - 1] === '>' && doc.slice(lineStartAt(doc, c - 1), c - 1).trim() !== '')
      return { from: c - 1, to: c, insert: '»', selection: c }
  }
  if (arrows && inserted === '<' && doc[c - 1] === '<')
    return { from: c - 1, to: c, insert: '«', selection: c }
  if (arrows && inserted === '-' && doc[c - 1] === '<')
    return { from: c - 1, to: c, insert: '←', selection: c }
  if (
    dashes &&
    inserted === ' ' &&
    c >= 2 &&
    doc[c - 1] === '-' &&
    doc[c - 2] === ' ' &&
    /\S/.test(lineBodyBefore(doc, c - 2))
  )
    return { from: c - 1, to: c, insert: '– ', selection: c + 1 }
  return null
}
