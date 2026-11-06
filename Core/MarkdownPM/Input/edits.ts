import { type Personalization, settingOf } from '../../Settings/personalization'
import { namesPage } from '../../Connections/links'
import {
  CLOSER,
  type LinkOccurrence,
  linkOccurrences,
  type LinkPart,
  mapSpans,
  mayHoldLink,
} from '../../Connections/connections'
import { inCalloutAt, inCodeAt, inCodeNear, spanAt, type DocScan } from '../Engine/docScan'
import {
  fenceAt,
  isBlockquoteLine,
  lineEndOf,
  inUrlRun,
  isWordChar,
  lineIndexAt,
  lineStartAt,
  lineEndAt,
  trimmedRange,
  quotePrefix,
  type Span,
  type TextEdit,
} from '../Engine/markdownCode'
import {
  isBlank,
  LIST_TYPES,
  MAX_NESTING_LEVEL,
  calloutHeadPrefixLen,
  codeSeat,
  headingParts,
  fenceBodyStart,
  signedLine,
  signKind,
  type ListMarker,
  readsLists,
  readsListsIn,
} from '../Engine/detect'
import { ownersOf } from '../Engine/listModel'
import { tokenize } from '../Engine/tokens'
import { isPaint } from '../Engine/paints'

// A transform reading more than its own line takes the caller's whole-document scan (one per doc version): the string-form code and callout tests re-split and re-pair every fence per call.

export interface Edit extends TextEdit {
  selection: number
  head?: number
  /** Writes list markers, so the runs it touches count again. */
  relist?: boolean
}

const shorthandCheckboxRe = /^([ \t]*)[-+]\[([ xX]?)\]$/

/** What stands before line `k`'s own text: inside a code block its fence's lead and any diff sign, elsewhere its quote. */
export function leadOf(scan: DocScan, k: number): string {
  const line = scan.lines[k]
  const f = scan.fences[k]
  return f ? line.slice(0, codeSeat(line, f)) : scan.quotes[k] ? quotePrefix(line) : ''
}

function listLineAt(
  scan: DocScan,
  selStart: number,
  selEnd: number,
): { ls: number; line: string; pfx: string; lm: ListMarker } | null {
  if (selStart !== selEnd) return null
  const k = lineIndexAt(scan, selStart)
  const lm = scan.markers[k]
  if (lm === null) return null
  return { ls: scan.lineStarts[k], line: scan.lines[k], pfx: leadOf(scan, k), lm }
}

export function continueListOnEnter(scan: DocScan, selStart: number, selEnd: number): Edit | null {
  const at = listLineAt(scan, selStart, selEnd)
  if (at === null) return null
  const { ls, line, pfx, lm } = at
  if (selStart < ls + lm.contentStart) return null

  // Enter ALWAYS continues the list, even on an empty item — the exits are Shift+Enter and Backspace on the empty marker.
  const indent = line.slice(pfx.length, lm.markerStart)
  const insert = `\n${pfx}${indent}${LIST_TYPES[lm.kind].marker}`
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length, relist: true }
}

export function continueBlockquoteOnEnter(
  scan: DocScan,
  selStart: number,
  selEnd: number,
): Edit | null {
  const k = lineIndexAt(scan, selStart)
  if (selStart !== selEnd || !scan.quotes[k]) return null
  const ls = scan.lineStarts[k]
  const line = scan.lines[k]
  const pfx = quotePrefix(line)
  if (selStart < ls + pfx.length) return null
  // Callouts keep continuing — their documented exit is caret placement below the box, and stripping a body `> ` would split it.
  if (isBlank(line.slice(pfx.length)) && !inCalloutAt(scan, selStart) && !scan.fences[k])
    return { from: ls, to: ls + line.length, insert: '', selection: ls }
  const insert = `\n${pfx.replace(/[ \t]+$/, '')} `
  return { from: selStart, to: selStart, insert, selection: selStart + insert.length }
}

export function calloutShorthand(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
  settings: Personalization = {},
): Edit | null {
  if (inserted !== '|' || selStart !== selEnd || !settingOf(settings, 'transformCallouts'))
    return null
  if (isLiteralAt(scan, selStart)) return null
  const doc = scan.text
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
    const pfx = quotePrefix(doc.slice(ls, lineEndAt(doc, selStart))).replace(/[ \t]+$/, '')
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

export function indentListOnTab(scan: DocScan, selStart: number, selEnd: number): Edit | null {
  const at = listLineAt(scan, selStart, selEnd)
  if (at === null || at.lm.level >= MAX_NESTING_LEVEL) return null
  const from = at.ls + at.pfx.length
  return { from, to: from, insert: '\t', selection: selStart + 1, relist: true }
}

export function outdentListOnShiftTab(
  scan: DocScan,
  selStart: number,
  selEnd: number,
): Edit | null {
  const at = listLineAt(scan, selStart, selEnd)
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

/** Where a Backspace takes the list marker of line `k`, behind its `pfx`-long prefix: the marker is one unit, so a caret anywhere past its first character takes all of it rather than leaving a stray space or half a box, and the line keeps its indent only where an item above owns it, as that item's continuation. */
function takeMarker(
  scan: DocScan,
  k: number,
  pfx: number,
  lm: ListMarker,
  selStart: number,
): Edit | null {
  const ls = scan.lineStarts[k]
  const from = ls + lm.markerStart
  const to = ls + lm.contentStart
  if (selStart <= from || selStart > to) return null
  const cut = ownersOf(scan, k, scan.fences[k]?.from).some((o) => o.k !== k) ? from : ls + pfx
  return { from: cut, to, insert: '', selection: cut }
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

export function smartBackspace(scan: DocScan, selStart: number, selEnd: number): Edit | null {
  if (selStart !== selEnd) return null
  const k = lineIndexAt(scan, selStart)
  const ls = scan.lineStarts[k]
  const line = scan.lines[k]

  const fence = scan.fences[k]
  const body = fence ? ls + fenceBodyStart(line, fence) : ls
  if (body > ls && selStart === body && ls > 0)
    return { from: ls - 1, to: body, insert: '', selection: ls - 1 }

  const pfx = leadOf(scan, k)
  const lm = scan.markers[k]
  const taken = lm && takeMarker(scan, k, pfx.length, lm, selStart)
  if (taken) return taken
  // A fence holds literal text past its own list, so collapsing a prefix there would eat characters the author typed as content.
  if (scan.scope !== 'page' || inCodeAt(scan, selStart)) return null
  // Inside a callout, never strip a lone `>` — that would drop the line out of the box, splitting it into a stray quote.
  if (inCalloutAt(scan, selStart)) {
    const headLen = calloutHeadPrefixLen(line)
    if (headLen !== null) {
      if (selStart > ls && selStart <= ls + headLen)
        return { from: ls, to: ls + headLen, insert: '', selection: ls }
      return null
    }
    if (!lm && selStart === ls + pfx.length && ls > 0)
      return { from: ls - 1, to: ls + pfx.length, insert: '', selection: ls - 1 }
    return null
  }
  const end = headingParts(line)?.contentStart ?? (pfx.length || null)
  if (end === null || selStart !== ls + end) return null
  return { from: ls, to: ls + end, insert: '', selection: ls }
}

export function canonicalizeCheckbox(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (inserted !== ' ' || selStart !== selEnd || !readsLists(scan.scope)) return null
  const k = lineIndexAt(scan, selStart)
  const f = scan.fences[k]
  if (isLiteralAt(scan, selStart) && (f === undefined || !readsListsIn(f))) return null
  const from = scan.lineStarts[k] + leadOf(scan, k).length
  const m = shorthandCheckboxRe.exec(scan.text.slice(from, selStart))
  if (m === null) return null
  const [, ws, inner] = m
  // The trailing space is the task-list grammar's own requirement, not decoration: without it the line reads as a bullet holding `[ ]`.
  const gfm = `${ws}- [${inner.toLowerCase() === 'x' ? 'x' : ' '}] `
  return { from, to: selStart, insert: gfm, selection: from + gfm.length }
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

/** The line at `at` where a link can be read, by its start and text, and the links of a text standing for it (the line itself, unless a reader walks it with a slot held open) under the scan's code mask; a line without an opener holds none. */
function linkLine(
  scan: DocScan,
  at: number,
): { ls: number; line: string; links: (text?: string) => LinkOccurrence[] } | null {
  const i = lineIndexAt(scan, at)
  const line = scan.lines[i]
  if (!mayHoldLink(line)) return null
  const ls = scan.lineStarts[i]
  return { ls, line, links: (text = line) => linkOccurrences(text, (p) => inCodeAt(scan, ls + p)) }
}

/** The link holding `at`, from past its first bracket through its closer, either syntax, as the editor draws it, so code touching it leaves none; its spans are relative to `at`'s line, empty slots kept. */
export function linkAt(scan: DocScan, at: number): LinkOccurrence | null {
  const l = linkLine(scan, at)
  if (!l) return null
  for (const o of l.links()) if (at - l.ls > o.full[0] && at - l.ls <= o.full[1]) return o
  return null
}

/** The first link of either syntax on the line at `from` that reaches strictly into `from`–`to`, so typing just past a closer never arms and a caret on a closer is outside. */
export function linkWithin(
  scan: DocScan,
  from: number,
  to = from,
): { start: number; text: string } | null {
  const l = linkLine(scan, from)
  if (!l) return null
  for (const o of l.links())
    if (l.ls + o.full[0] < to && l.ls + o.full[1] > from)
      return { start: l.ls + o.full[0], text: l.line.slice(o.full[0], o.full[1]) }
  return null
}

/** What stands in an empty slot so its link still reads, since both patterns refuse an empty title or destination. */
const SLOT_HOLDER = '\u0000'

/** The link the grammar can't read at `at` because its slot there is empty: a written link whose slot at the caret was emptied, read whole with that slot empty, else the link still being written before `at`, as it reads once closed, its slot cut back to the caret. */
export function openLinkAt(scan: DocScan, at: number): LinkOccurrence | null {
  const l = linkLine(scan, at)
  if (!l) return null
  const { ls, line } = l
  const rel = at - ls
  const head = line.slice(0, rel)
  const held = head + SLOT_HOLDER + line.slice(rel)
  const emptied = linkOccurrences(held, (p) => inCodeAt(scan, ls + (p > rel ? p - 1 : p))).find(
    (o) => {
      const part = partOf(o, rel)
      return part !== null && o[part]![0] === rel && o[part]![1] === rel + 1
    },
  )
  if (emptied) return mapSpans(emptied, ([a, b]) => [a > rel ? a - 1 : a, b > rel ? b - 1 : b])
  const wiki = head.lastIndexOf('[[')
  const md = head.lastIndexOf('](')
  if (wiki === -1 && md === -1) return null
  const text = `${head}${SLOT_HOLDER}${CLOSER[wiki > md ? 'wiki' : 'markdown']}`
  const o = l.links(text).find((x) => x.full[1] === text.length)
  return o ? mapSpans(o, ([a, b]) => [a, Math.min(b, head.length)]) : null
}

/** Which slot of `o` holds the line-relative `rel`, ends inclusive and in slot order: the one rule Return, `]`, `[`, the typing transforms, the `§` transform, and the picker ask. */
export function partOf(o: LinkOccurrence, rel: number): LinkPart | null {
  const within = (s: Span | null): boolean => s !== null && rel >= s[0] && rel <= s[1]
  return within(o.title)
    ? 'title'
    : within(o.heading)
      ? 'heading'
      : within(o.shown)
        ? 'shown'
        : null
}

/** The written link whose slot holds `at`, outside code, with that slot and the line's start. */
export function slotAt(
  scan: DocScan,
  at: number,
): { link: LinkOccurrence; part: LinkPart; from: number } | null {
  const link = linkAt(scan, at)
  const from = scan.lineStarts[lineIndexAt(scan, at)]
  const part = link && partOf(link, at - from)
  return link && part ? { link, part, from } : null
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
    const glued = isWordChar(doc[c - 2])
    if (glued || openDoubles % 2 === 1) return null
    return { from: c, to: c, insert: inserted + pair.multi, selection: c + 1 }
  }
  if (doc[c] === inserted && pair.close === inserted && !isWordChar(doc[runEndAt(doc, c)]))
    return { from: c, to: c, insert: '', selection: c + 1 }
  if (DOUBLED_ONLY.has(inserted)) return null
  if (!isPairEdge(prev, OPEN_MARKS) && !(inserted === '(' && prev === ']')) return null
  return { from: c, to: c, insert: inserted + pair.close, selection: c + 1 }
}

/** The one transform that fires only where a link names its page: a wikilink's title half, or a markdown destination's page half. An alias, a label, an address, and a heading are prose, and may hold the character. */
export function headingHash(
  scan: DocScan,
  selStart: number,
  selEnd: number,
  inserted: string,
): Edit | null {
  if (inserted !== '§' || inCodeNear(scan, selStart)) return null
  const li = lineIndexAt(scan, selStart)
  const ls = scan.lineStarts[li]
  const o = linkAt(scan, selStart) ?? openLinkAt(scan, selStart)
  if (!o || partOf(o, selStart - ls) !== 'title' || selEnd - ls > o.title[1]) return null
  if (o.syntax === 'markdown' && !namesPage(scan.lines[li].slice(o.title[0], o.title[1])))
    return null
  return { from: selStart, to: selEnd, insert: '#', selection: selStart + 1 }
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
  !isWordChar(doc[from - wrapper.length - 1]) &&
  !isWordChar(doc[to + wrapper.length])

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

function closerEndAt(scan: DocScan, caret: number): number | null {
  if (inCodeAt(scan, caret)) return null
  const doc = scan.text
  const paint = doc[caret] === '=' ? paintEndAt(doc, caret) : null
  if (paint !== null) return paint
  const before = doc.slice(lineStartAt(doc, caret), caret)
  // A single-char symmetric marker flanked by word chars is prose — contractions would poison the parity and teleport the caret.
  const count = (s: string): number => {
    if (s.length > 1) return before.split(s).length - 1
    let n = 0
    for (let i = before.indexOf(s); i !== -1; i = before.indexOf(s, i + 1)) {
      if (!(isWordChar(before[i - 1]) && isWordChar(before[i + 1] ?? doc[caret]))) n++
    }
    return n
  }
  for (const { close, open } of CLOSERS) {
    if (!doc.startsWith(close, caret)) continue
    if (
      close.length === 1 &&
      open === close &&
      isWordChar(doc[caret - 1]) &&
      isWordChar(doc[caret + 1])
    )
      continue
    // Symmetric markers count parity; asymmetric ones compare opens to closes, or `**a**|**b**` false-positives.
    const inside = open === close ? count(open) % 2 === 1 : count(open) > count(close)
    if (!inside) continue
    return open === close && PAIRS[open[0]].group === 'pairMarkers'
      ? runEndAt(doc, caret)
      : caret + close.length
  }
  return null
}

/** Where the paint whose words end at `caret` ends, past its closer: an `=` is too often prose, and too often in code, for parity alone to read. */
function paintEndAt(doc: string, caret: number): number | null {
  const ls = lineStartAt(doc, caret)
  const tk = tokenize(doc.slice(ls, lineEndAt(doc, caret))).find(
    (tk) => isPaint(tk.kind) && tk.contentRange[1] === caret - ls,
  )
  return tk ? ls + tk.range[1] : null
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
      (math !== undefined && math.from !== at)
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

// Inside a link's slots or a link still being written; a transform typed just past `]]` is prose.
const isLiteralAt = (scan: DocScan, c: number): boolean =>
  inCodeNear(scan, c) ||
  spanAt(scan.maths, c) !== undefined ||
  slotAt(scan, c) !== null ||
  openLinkAt(scan, c) !== null ||
  inUrlRun(scan.text, c)

// An unclosed `[` holds a citation's label or a link's text: a glyph written there lands inside the reference.
const inBracket = (doc: string, c: number): boolean => {
  const line = doc.slice(lineStartAt(doc, c), c)
  const open = line.lastIndexOf('[')
  return open !== -1 && !line.slice(open).includes(']')
}

export const literalOrBracketAt = (scan: DocScan, c: number): boolean =>
  isLiteralAt(scan, c) || inBracket(scan.text, c)

const lineBodyBefore = (scan: DocScan, pos: number): string => {
  const k = lineIndexAt(scan, pos)
  return scan.text.slice(scan.lineStarts[k] + leadOf(scan, k).length, pos)
}

const opensCodeList = (scan: DocScan, pos: number): boolean => {
  const f = scan.fences[lineIndexAt(scan, pos)]
  return f !== undefined && readsListsIn(f) && isBlank(lineBodyBefore(scan, pos))
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
  if (isBlank(lineBodyBefore(scan, c - 1)) || literalOrBracketAt(scan, c)) return null
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
  if (literalOrBracketAt(scan, c) || isBlank(lineBodyBefore(scan, c - 2))) return null
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
  if (pair && PUNCTUATION[pair[1] + inserted] && !isLiteralAt(scan, c))
    return { from: c - 1, to: c, insert: pair + inserted, selection: c + 2 }
  const glyph = PUNCTUATION[doc[c - 1] + inserted]
  if (!glyph || PUNCTUATION[doc.slice(c - 2, c)] || isLiteralAt(scan, c)) return null
  if (glyph === '‖') {
    const before = lineBodyBefore(scan, c - 1)
    if (isBlank(before) || before.includes('|')) return null
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
  if ((doc[c - 1] === '/' || inserted === '/') && isWordChar(doc[c - 2])) return null
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
  if (!'-–←><'.includes(doc[c - 1])) return null
  if (isLiteralAt(scan, c))
    return inserted === '>' && doc[c - 1] === '-' && opensCodeList(scan, c - 1)
      ? { from: c - 1, to: c, insert: '→', selection: c }
      : null
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
    if (
      doc[c - 1] === '-' &&
      doc[c - 2] !== '-' &&
      (arrows || isBlank(lineBodyBefore(scan, c - 1)))
    )
      return { from: c - 1, to: c, insert: '→', selection: c }
    if (arrows && doc[c - 1] === '>' && !isBlank(doc.slice(lineStartAt(doc, c - 1), c - 1)))
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
    !isBlank(lineBodyBefore(scan, c - 2))
  )
    return { from: c - 1, to: c, insert: '– ', selection: c + 1 }
  return null
}
