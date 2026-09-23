import type { Personalization } from '@pommora/core/Settings/personalization'
import { isInsideWikilink } from '../Engine/parser'
import { aliasSpanAt } from '@pommora/core/Connections/connections'
import { inCalloutAt, inCodeAt, spanAt, type DocScan } from '../Engine/docScan'
import { fenceAt, lineEndOf, lineIndexAt } from '../Engine/markdownCode'
import {
  parseListMarker,
  isSequenced,
  ordinalOf,
  ordinalText,
  nestedUnder,
  MAX_NESTING_LEVEL,
  blockquotePrefixRe,
  calloutHeadPrefixLen,
  isBlockquoteLine,
  type MarkdownScope,
} from '../Engine/detect'

// A transform reading more than its own line takes the caller's whole-document scan (one per doc version): the string-form code and callout tests re-split and re-pair every fence per call.

export interface Edit {
  from: number
  to: number
  insert: string
  selection: number
  head?: number
}

export const lineStartAt = (doc: string, pos: number): number =>
  pos <= 0 ? 0 : doc.lastIndexOf('\n', pos - 1) + 1
export const lineEndAt = (doc: string, pos: number): number => {
  const i = doc.indexOf('\n', pos)
  return i === -1 ? doc.length : i
}

const lineMarkerRe = /^(\s*)(?:(?:\d+|[A-Z])\.|[-+→]|>|#{1,6})(?:[ \t]*\[[ xX]?\])?[ \t]+/
const shorthandCheckboxRe = /^([ \t]*)([-+])\[([ xX]?)\]$/

// Gated to REAL blockquotes only (whitespace after `>`) so `>x` isn't read as quoted here while the renderer treats it as plain text.
// A cell draws no quote, so a `>` there is prose and carries no prefix — otherwise the keys would nest inside a box the surface never shows.
const blockPrefix = (line: string, scope: MarkdownScope = 'page'): string =>
  scope === 'page' && isBlockquoteLine(line) ? (blockquotePrefixRe.exec(line)?.[0] ?? '') : ''

export function continueListOnEnter(
  doc: string,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (selStart !== selEnd) return null
  const ls = lineStartAt(doc, selStart)
  const lineEnd = lineEndAt(doc, selStart)
  const line = doc.slice(ls, lineEnd)
  const pfx = blockPrefix(line, scope)
  const lm = parseListMarker(line.slice(pfx.length))
  if (lm === null) return null
  if (selStart < ls + pfx.length + lm.contentStart) return null

  // Enter ALWAYS continues the list, even on an empty item — the exits are Shift+Enter and Backspace on the empty marker.
  const indent = line.slice(pfx.length, pfx.length + lm.markerStart)

  const kind = lm.kind
  if (isSequenced(kind)) {
    const restOfLine = doc.slice(selStart, lineEnd)
    let counter = ordinalOf(lm) + 1
    const newPrefix = `\n${pfx}${indent}${ordinalText(kind, counter)}. `
    const caret = selStart + newPrefix.length
    let insert = `${newPrefix}${restOfLine}`
    let to = lineEnd
    let pendingSkipped = ''
    counter++
    for (let p = lineEnd; p < doc.length; ) {
      const fs = p + 1
      const fe = lineEndAt(doc, fs)
      const fline = doc.slice(fs, fe)
      const fpfx = blockPrefix(fline, scope)
      const finner = fline.slice(fpfx.length)
      const flm = parseListMarker(finner)
      const sameLevel =
        flm !== null &&
        flm.kind === kind &&
        fpfx === pfx &&
        fline.slice(fpfx.length, fpfx.length + flm.markerStart) === indent
      if (!sameLevel) {
        if (fpfx === pfx && nestedUnder(finner, indent)) {
          pendingSkipped += `\n${fline}`
          p = fe
          continue
        }
        break
      }
      insert += `${pendingSkipped}\n${pfx}${indent}${ordinalText(kind, counter)}. ${finner.slice(flm.contentStart)}`
      pendingSkipped = ''
      counter++
      to = fe
      p = fe
    }
    return { from: selStart, to, insert, selection: caret }
  }

  const next = lm.kind === 'checkbox' ? `${lm.bullet ?? '-'} [ ] ` : `${lm.bullet ?? '-'} `
  const insert = `\n${pfx}${indent}${next}`
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length }
}

export function continueBlockquoteOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
): Edit | null {
  if (selStart !== selEnd) return null
  const doc = scan.text
  const ls = lineStartAt(doc, selStart)
  // Ungated on purpose: continues a `>x` line too, which blockPrefix's isBlockquoteLine gate would drop.
  const m = blockquotePrefixRe.exec(doc.slice(ls, lineEndAt(doc, selStart)))
  if (m === null || selStart < ls + m[0].length) return null
  const lineEnd = lineEndAt(doc, selStart)
  // Callouts keep continuing — their documented exit is caret placement below the box, and stripping a body `> ` would split it.
  if (doc.slice(ls + m[0].length, lineEnd).trim() === '' && !inCalloutAt(scan, selStart)) {
    return { from: ls, to: lineEnd, insert: '', selection: ls }
  }
  const insert = `\n${m[0].replace(/[ \t]+$/, '')} `
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length }
}

export function calloutShorthand(
  doc: string,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== '|' || selStart !== selEnd || settings.transformCallouts === false) return null
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
    const pfx = (
      blockquotePrefixRe.exec(doc.slice(ls, lineEndAt(doc, selStart)))?.[0] ?? '> '
    ).replace(/[ \t]+$/, '')
    const insert = `\n${pfx} `
    return { from: selStart, to: selEnd, insert, selection: selStart + insert.length }
  }
  return { from: selStart, to: selEnd, insert: '\n', selection: selStart + 1 }
}

export function indentListOnTab(
  doc: string,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (selStart !== selEnd) return null
  const ls = lineStartAt(doc, selStart)
  const line = doc.slice(ls, lineEndAt(doc, selStart))
  const pfx = blockPrefix(line, scope)
  const lm = parseListMarker(line.slice(pfx.length))
  if (lm === null || lm.level >= MAX_NESTING_LEVEL) return null
  return { from: ls + pfx.length, to: ls + pfx.length, insert: '\t', selection: selStart + 1 }
}

export function outdentListOnShiftTab(
  doc: string,
  selStart: number,
  selEnd: number,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (selStart !== selEnd) return null
  const ls = lineStartAt(doc, selStart)
  const line = doc.slice(ls, lineEndAt(doc, selStart))
  const pfx = blockPrefix(line, scope)
  const inner = line.slice(pfx.length)
  if (parseListMarker(inner) === null || !/^[ \t]/.test(inner)) return null
  return {
    from: ls + pfx.length,
    to: ls + pfx.length + 1,
    insert: '',
    selection: Math.max(ls + pfx.length, selStart - 1),
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
        if (selStart !== innerContentStart) return null
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

  // A cell's `#` and `>` are prose, so only a list marker collapses there — `lineMarkerRe` would eat two characters of what the author typed.
  const markerLen =
    scope === 'cell' ? parseListMarker(line)?.contentStart : lineMarkerRe.exec(line)?.[0].length
  if (markerLen === undefined) return null
  const contentStart = ls + markerLen
  if (selStart !== contentStart) return null
  return { from: ls, to: contentStart, insert: '', selection: ls }
}

export function canonicalizeCheckbox(
  doc: string,
  selStart: number,
  selEnd: number,
  inserted: string,
  scope: MarkdownScope = 'page',
): Edit | null {
  if (inserted !== ' ' || selStart !== selEnd) return null
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
  if (')]}'.includes(inserted) && doc[c] === inserted && settings.pairBrackets !== false)
    return inCodeAt(scan, c) ? null : { from: c, to: c, insert: '', selection: c + 1 }
  const pair = PAIRS[inserted]
  if (!pair || settings[pair.group] === false || !isPairEdge(doc[c], CLOSE_MARKS)) return null
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
  if (inserted === '[') {
    const ls = lineStartAt(doc, c)
    // Never inside an alias: the pair's `]` is the character the input guard refuses there, and would truncate the link.
    if (aliasSpanAt(doc.slice(ls, lineEndAt(doc, c)), c - ls)) return null
  }
  return { from: c, to: c, insert: inserted + pair.close, selection: c + 1 }
}

export const trimmedRange = (doc: string, from: number, to: number): [number, number] => {
  let f = from
  let t = to
  while (f < t && /\s/.test(doc[f])) f++
  while (t > f && /\s/.test(doc[t - 1])) t--
  return f === t ? [from, to] : [f, t]
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
  if (!pair || selStart === selEnd || settings.wrapSelections !== true) return null
  const doc = scan.text
  const [from, to] = trimmedRange(doc, selStart, selEnd)
  const cycle = WRAP_CYCLES[open] ?? []
  const outer =
    [...cycle].sort((a, b) => b.length - a.length).find((w) => wrappedBy(doc, from, to, w)) ?? ''
  const start = from - outer.length
  const end = to + outer.length
  if (settings[pair.group] === false || inCodeAt(scan, start) || inCodeAt(scan, end)) return null
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
  if (settings.deletePairsTogether === false) return null
  if (selStart !== selEnd || selStart === 0 || inCodeAt(scan, selStart)) return null
  const doc = scan.text
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

function closerEndAt(scan: DocScan, c: number): number | null {
  if (inCodeAt(scan, c)) return null
  const doc = scan.text
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
  if (selStart !== selEnd || settings.exitPairsOnEnter === false) return null
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
  if (selStart !== selEnd || settings.pairMarkers === false) return null
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
  if (selStart !== selEnd || settings.exitPairsOnEnter === false) return null
  const end = closerEndAt(scan, selStart)
  return end === null ? null : shiftEnterEdit(scan, end, end)
}

// A URL-shaped run or any still-open `](…` target is link content: converting `--` → `—` would corrupt the path.
const urlRunRe = /(?:^|[\s([{<"'])[a-z][a-z0-9+.-]*:\/\/\S*$/i
const inLinkTarget = (doc: string, c: number): boolean => {
  const line = doc.slice(lineStartAt(doc, c), c)
  const open = line.lastIndexOf('](')
  return open !== -1 && !line.slice(open).includes(')')
}
const inUrlRun = (doc: string, c: number): boolean =>
  urlRunRe.test(doc.slice(lineStartAt(doc, c), c)) || inLinkTarget(doc, c)
const isLiteralAt = (scan: DocScan, c: number): boolean =>
  inCodeAt(scan, c) ||
  inCodeAt(scan, c - 1) ||
  isInsideWikilink(c, scan.text) ||
  inUrlRun(scan.text, c)

// An unclosed `[` holds a citation's label or a link's text: a glyph written there lands inside the reference.
const inBracket = (doc: string, c: number): boolean => {
  const line = doc.slice(lineStartAt(doc, c), c)
  const open = line.lastIndexOf('[')
  return open !== -1 && !line.slice(open).includes(']')
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
  if (inserted !== '.' || selStart !== selEnd || settings.transformEllipses === false) return null
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
  if (inserted !== '#' || selStart !== selEnd || settings.transformSections !== true) return null
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
  if (inserted !== ' ' || selStart !== selEnd || settings.transformBullets !== true) return null
  const doc = scan.text
  const c = selStart
  if (c < 2 || doc[c - 1] !== '^' || doc[c - 2] !== ' ') return null
  if (isLiteralAt(scan, c) || inBracket(doc, c)) return null
  const ls = lineStartAt(doc, c)
  const pfx = blockPrefix(doc.slice(ls, lineEndAt(doc, c)))
  if (!/\S/.test(doc.slice(ls + pfx.length, c - 2))) return null
  return { from: c - 1, to: c, insert: '• ', selection: c + 1 }
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
  if (selStart !== selEnd || settings.transformEquations === false) return null
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
  if (inCodeAt(scan, c) || inCodeAt(scan, c - 1)) return null
  const dashes = settings.transformDashes !== false
  const arrows = settings.transformArrows !== false

  if (
    dashes &&
    inserted !== '-' &&
    inserted !== '>' &&
    c >= 2 &&
    doc[c - 1] === '-' &&
    doc[c - 2] === '-' &&
    doc[c - 3] !== '-' &&
    doc[c - 3] !== '!'
  ) {
    if (isInsideWikilink(c, doc) || inUrlRun(doc, c)) return null
    return { from: c - 2, to: c, insert: `—${inserted}`, selection: c }
  }
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
  if (dashes && inserted === ' ' && c >= 2 && doc[c - 1] === '-' && doc[c - 2] === ' ') {
    const ls = lineStartAt(doc, c)
    const pfx = blockPrefix(doc.slice(ls, lineEndAt(doc, c)))
    const before = doc.slice(ls + pfx.length, c - 2)
    if (/\S/.test(before) && !isInsideWikilink(c, doc)) {
      return { from: c - 1, to: c, insert: '– ', selection: c + 1 }
    }
  }
  return null
}
