import { insideMark, type LinkKind, shiftToken, tokenize, type TokenKind } from '../Engine/tokens'
import {
  isBlank,
  headingParts,
  calloutHeadPrefixLen,
  isCalloutHead,
  ordinalText,
  isSequenced,
  parseListMarker,
  stripQuotePrefix,
  type ListKind,
  type ListMarker,
  type MarkdownScope,
} from '../Engine/detect'
import {
  isBlockquoteLine,
  type TextEdit,
  lineStartAt,
  lineEndAt,
  lineIndexAt,
  quotePrefixWidth,
  reachEnd,
  trimmedRange,
  overlaps,
} from '../Engine/markdownCode'
import type { HeadingLevel } from '../../Actions/gripMenu'
import type { BlockFormat, LinkWrapKind } from '../../Actions/blockMenu'
import { emptyTable } from '../Engine/Tables/model'
import { isPaint, type Paint, type PaintColor, writtenMark } from '../Engine/paints'
import { serialize } from '../Engine/Tables/codec'
import { type DocScan, inCodeAt, inFenceAt } from '../Engine/docScan'
import { itemAt, ownersOf, readsFrom, siblingsAt, subBlockAt } from '../Engine/listModel'
import { drawnKind } from '../Engine/intents'
import { type Personalization, settingOf } from '../../Settings/personalization'
import { blockPrefix } from './edits'
import { isValidLink, normalizeLinkUrl } from '../../Paths/urlPath'
import { serializeLink } from '../../Connections/linkValue'

type InlineFormat = keyof typeof WRAP | LinkWrapKind

export interface FormatEdit {
  changes: TextEdit[]
  selection?: number
  relist?: boolean
}

/** True for a real blockquote, but NOT a callout head, whose `>` is box chrome — stripping it orphans the `[!type]`. */
export function isQuoteToggleable(line: string): boolean {
  return isBlockquoteLine(line) && !isCalloutHead(line)
}

const WRAP = {
  bold: '**',
  italic: '*',
  strikethrough: '~~',
  highlight: '==',
  textColor: '=',
  inlineCode: '`',
} as const

interface LinkWrap {
  kind: LinkKind
  open: string
  close: string
  caret: (from: number, to: number) => number
}

/** Where the caret rests after wrapping: `link` inside the empty `()`, `linkText` at the label's start, `connection` at the title's end. */
const LINKS: Record<LinkWrapKind, LinkWrap> = {
  link: { kind: 'link', open: '[', close: ']()', caret: (_, t) => t + 3 },
  linkText: { kind: 'link', open: '[', close: ']()', caret: (f) => f + 1 },
  connection: { kind: 'wikiLink', open: '[[', close: ']]', caret: (_, t) => t + 2 },
}

const SWAPS: Partial<Record<TokenKind, TokenKind>> = { bold: 'italic', italic: 'bold' }
const MARKER_CHARS = '*_~=`'

/** Inline marks are line-local, so only the selection's line is tokenized, in line-relative coords; the marks covering it are read with the marker characters at its edges stripped, and a fenced line holds none. An edge inside a link widens to the whole link, so a mark wraps the link rather than splitting its syntax. */
export function underSelection(scan: DocScan, selFrom: number, selTo: number) {
  const doc = scan.text
  let [from, to] = trimmedRange(doc, selFrom, selTo)
  const ls = lineStartAt(doc, from)
  const line = doc.slice(ls, lineEndAt(doc, from))
  const fenced = inFenceAt(scan, from)
  const tokens = fenced ? [] : tokenize(line)
  let f = from - ls
  let t = to - ls
  while (f < t && MARKER_CHARS.includes(line[f])) f++
  while (t > f && MARKER_CHARS.includes(line[t - 1])) t--
  for (const { kind, range } of tokens) {
    if ((kind !== 'link' && kind !== 'wikiLink') || !overlaps(range, [f, t])) continue
    f = Math.min(f, range[0])
    t = Math.max(t, range[1])
  }
  from = Math.min(from, ls + f)
  to = Math.max(to, ls + t)
  const covering = tokens.filter((tk) => insideMark(tk, f, t))
  return { fenced, from, to, ls, line, tokens, f, t, covering }
}

/** A paint's `color` is the highlight chord's when null, which writes the accent and removes any paint it lands in; `'accent'` is the uncolored highlight. A span wears one color, so a color picked anywhere in it recolors it, turns it into the other paint, or, in its own paint and color, removes it. A paint is written only where it reads back as itself. */
export function toggleInline(
  scan: DocScan,
  selFrom: number,
  selTo: number,
  fmt: InlineFormat,
  color: PaintColor | 'accent' | null = null,
): FormatEdit | null {
  const { fenced, from, to, ls, line, tokens, f, t, covering } = underSelection(
    scan,
    selFrom,
    selTo,
  )
  if (fenced || (fmt !== 'inlineCode' && inCodeAt(scan, from))) return null
  const doc = scan.text
  if (fmt in LINKS) return toggleWrap(doc, from, to, LINKS[fmt as LinkWrapKind])
  const kind = fmt as keyof typeof WRAP & TokenKind
  const close = WRAP[kind]
  const mark = color && color !== 'accent' ? color : undefined
  const open = mark ? close + writtenMark(mark) : close
  const found =
    covering.find((tk) => (isPaint(kind) ? isPaint(tk.kind) : tk.kind === kind)) ??
    covering.find(
      (tk) =>
        tk.kind === SWAPS[kind] &&
        (from === to || (tk.contentRange[0] === f && tk.contentRange[1] === t)),
    )
  const sel: [number, number] = [from - ls, to - ls]
  const off =
    !!found && ((isPaint(kind) && color === null) || (found.kind === kind && found.color === mark))
  if (isPaint(kind) && !off) {
    if (!found && tokens.some((tk) => isPaint(tk.kind) && overlaps(tk.range, sel))) return null
    const [a, b] = found ? found.range : sel
    const words = (found ? line.slice(...found.contentRange) : line.slice(...sel)) || '\u0000'
    const end = a + open.length + words.length + close.length
    const written = line.slice(0, a) + open + words + close + line.slice(b)
    if (
      b > line.length ||
      !tokenize(written).some(
        (tk) => tk.kind === kind && tk.range[0] === a && tk.range[1] === end && tk.color === mark,
      )
    )
      return null
  }
  if (found) {
    const [m0, m1] = shiftToken(found, ls).markerRanges
    return {
      changes: [
        { from: m0[0], to: m0[1], insert: off ? '' : open },
        { from: m1[0], to: m1[1], insert: off ? '' : close },
      ],
    }
  }
  return {
    changes: [
      { from, to: from, insert: open },
      { from: to, to, insert: close },
    ],
    selection: to + open.length,
  }
}

export function editFor(
  action: string,
  scan: DocScan,
  from: number,
  to: number,
  settings: Personalization,
  scope: MarkdownScope,
): FormatEdit | null {
  const [group, value] = action.split(':')
  switch (group) {
    case 'link':
      return value === 'insert' && !inFenceAt(scan, from)
        ? insertLinkEdit(scan.text, from, to)
        : null
    case 'format':
      return toggleInline(scan, from, to, value as InlineFormat)
    case 'highlight':
    case 'textColor':
      return toggleInline(scan, from, to, group as Paint, value as PaintColor | 'accent')
    case 'heading':
      return setHeading(scan.text, from, to, Number(value) as HeadingLevel)
    case 'list':
      return setList(scan, from, to, value as ListKind, settings, scope)
    case 'block':
      return setBlock(scan, from, to, value as BlockFormat)
    default:
      return null
  }
}

function insertLinkEdit(doc: string, selFrom: number, selTo: number): FormatEdit | null {
  const [from, to] = trimmedRange(doc, selFrom, selTo)
  const text = doc.slice(from, to)
  if (!isValidLink(text)) return null
  const insert = serializeLink(normalizeLinkUrl(text), text)
  return { changes: [{ from, to, insert }], selection: from + insert.length }
}

function toggleWrap(
  doc: string,
  from: number,
  to: number,
  { kind, open, close, caret }: LinkWrap,
): FormatEdit {
  const ls = lineStartAt(doc, from)
  const found = tokenize(doc.slice(ls, lineEndAt(doc, from))).find(
    (tk) => tk.kind === kind && tk.range[0] <= from - ls && to - ls <= tk.range[1],
  )
  const existing = found ? shiftToken(found, ls) : undefined
  if (existing) {
    return {
      changes: [
        {
          from: existing.range[0],
          to: existing.range[1],
          insert: doc.slice(...existing.contentRange),
        },
      ],
    }
  }
  return {
    changes: [
      { from, to: from, insert: open },
      { from: to, to, insert: close },
    ],
    selection: caret(from, to),
  }
}

function listMarkerText(kind: ListKind): string {
  switch (kind) {
    case 'ordered':
    case 'alphabetical':
      return `${ordinalText(kind, 1)}. `
    case 'checkbox':
      return '- [ ] '
    case 'arrow':
      return '→ '
    case 'bullet':
      return '- '
  }
}

/** For a callout HEAD the chrome includes the hidden `[!type] ` tag. Block transforms edit from AFTER the chrome, which preserves the box and keeps the change out of the callout guard's window. */
export function splitPrefix(line: string, scope: MarkdownScope): { prefix: string; body: string } {
  const quote = blockPrefix(line, scope)
  const len = quote === '' ? 0 : (calloutHeadPrefixLen(line) ?? quote.length)
  return { prefix: line.slice(0, len), body: line.slice(len) }
}

/** Prefix-aware: `> - item` becomes `> ## item`, never `## - item` popped out of its quote. */
export function setHeading(doc: string, from: number, to: number, level: HeadingLevel): FormatEdit {
  const lines = selectedLines(doc, from, to)
  if (lines.length === 0) return { changes: [] }
  const changes: FormatEdit['changes'] = []
  let lastEnd = 0
  for (const l of lines) {
    const lead = level === 0 ? l.pad : `${l.pad}${'#'.repeat(level)} `
    changes.push({ from: l.ls + l.prefix.length, to: l.le - l.inner.length, insert: lead })
    lastEnd = l.ls + l.prefix.length + lead.length + l.inner.length
  }
  return lines.length === 1 ? { changes, selection: lastEnd } : { changes }
}

/** Read by every formatter that rewrites a line's marker, so all of them agree on what a line is. */
interface SelectedLine {
  ls: number
  le: number
  prefix: string
  pad: string
  indent: string
  inner: string
}

function readLine(doc: string, ls: number, scope: MarkdownScope): SelectedLine {
  const le = lineEndAt(doc, ls)
  const { prefix, body } = splitPrefix(doc.slice(ls, le), scope)
  const lm = parseListMarker(body)
  const stripped = stripInnerMarkers(body)
  // An item's indent sits before its marker, a paragraph's leads its words — held apart either way, so converting a nested item keeps its level.
  const indent = lm ? body.slice(0, lm.markerStart) : (/^[ \t]*(?=\S)/.exec(stripped)?.[0] ?? '')
  return {
    ls,
    le,
    prefix,
    pad: prefix !== '' && !/[ \t]$/.test(prefix) ? ' ' : '',
    indent,
    inner: lm ? stripped : stripped.trimStart(),
  }
}

/** A selection passes over its blank lines; a caret alone on one keeps it, so the block starts there. */
function selectedLines(doc: string, from: number, to: number): SelectedLine[] {
  return spannedLines(doc, from, to)
    .map(({ ls }) => readLine(doc, ls, 'page'))
    .filter((l) => from === to || !isBlank(doc.slice(l.ls + l.prefix.length, l.le)))
}

/** What a list-type pick reaches. A caret takes its item's group: with Preserve List-Level Formatting on, the siblings drawn as its type; off, the siblings and everything nested under them. A range takes every item it touches and turns its plain lines into items. A continuation answers for its item and a blank line for itself, a code block's lines only by a pick wholly inside it, and math, tables, a callout's head and a fence's delimiters never are. */
function listReach(
  scan: DocScan,
  from: number,
  to: number,
  settings: Personalization,
  scope: MarkdownScope,
): { k: number; lm: ListMarker | null }[] {
  const anchor = lineIndexAt(scan, from)
  const upTo = lineIndexAt(scan, reachEnd(scan.text, from, to))
  const reader = readsFrom(scan, upTo, anchor, scope) ? anchor : 'outside'
  const markerAt = (k: number): ListMarker | null => itemAt(scan, k, reader, scope)
  const endOf = (k: number): number => subBlockAt(scan, scan.lineStarts[k], scope)!.to
  const blank = (k: number): boolean => isBlank(splitPrefix(scan.lines[k], scope).body)
  const owners = ownersOf(scan, anchor, reader, scope)
  const item = owners[0]?.k ?? null
  const reached = new Set<number>()
  if (from === to) {
    if (item === null || blank(anchor)) reached.add(anchor)
    else {
      const { items, last } = siblingsAt(scan, item, scope)
      const kind = drawnKind(markerAt(item)!)
      const preserve = settingOf(settings, 'preserveListLevels')
      const span = preserve
        ? items
        : Array.from({ length: last - items[0] + 1 }, (_, n) => items[0] + n)
      for (const k of span) {
        const lm = markerAt(k)
        if (lm !== null && (!preserve || drawnKind(lm) === kind)) reached.add(k)
      }
    }
  } else {
    const open = owners.reverse()
    for (let k = anchor; k <= upTo; k++) {
      while (open.length > 0 && open[open.length - 1].end < scan.lineStarts[k]) open.pop()
      if (markerAt(k) !== null && k !== item) open.push({ k, end: endOf(k) })
      if (!blank(k)) reached.add(open[open.length - 1]?.k ?? k)
    }
  }
  const outOfReach = (k: number): boolean =>
    !readsFrom(scan, k, reader, scope) ||
    (scope === 'page' &&
      (scan.callouts[k]?.first || (scan.fences[k]?.role ?? 'content') !== 'content'))
  return [...reached]
    .sort((a, b) => a - b)
    .filter((k) => !outOfReach(k))
    .map((k) => ({ k, lm: markerAt(k) }))
}

export function listKindOf(
  scan: DocScan,
  from: number,
  to: number,
  settings: Personalization,
  scope: MarkdownScope,
): ListKind | null {
  const kinds = new Set(
    listReach(scan, from, to, settings, scope).map(({ lm }) => lm && drawnKind(lm)),
  )
  return kinds.size === 1 ? [...kinds][0] : null
}

/** The one list-type switch. An item already drawn as the type is left alone, a numbered or lettered one is written over, and a plain line becomes an item. */
export function setList(
  scan: DocScan,
  from: number,
  to: number,
  kind: ListKind,
  settings: Personalization,
  scope: MarkdownScope,
): FormatEdit {
  const doc = scan.text
  const marker = listMarkerText(kind)
  const changes: FormatEdit['changes'] = []
  let selection: number | undefined
  const reach = listReach(scan, from, to, settings, scope)
  for (const { k, lm } of reach) {
    const ls = scan.lineStarts[k]
    if (lm === null) {
      const l = readLine(doc, ls, scope)
      const lead = `${l.pad}${l.indent}${marker}`
      changes.push({ from: ls + l.prefix.length, to: l.le - l.inner.length, insert: lead })
      selection = ls + l.prefix.length + lead.length + l.inner.length
    } else if (isSequenced(lm) || drawnKind(lm) !== kind)
      changes.push({ from: ls + lm.markerStart, to: ls + lm.contentStart, insert: marker })
  }
  // A pick reaching one plain line keeps the caret at its end; any other pick leaves the selection where the edit maps it.
  return reach.length === 1 && selection !== undefined
    ? { changes, selection, relist: true }
    : { changes, relist: true }
}

/** Quoting is the one line transform a blank line belongs in: a bare `>` is the quote's own empty line, and skipping it splits the block. */
function spannedLines(doc: string, from: number, to: number): { ls: number; le: number }[] {
  const out: { ls: number; le: number }[] = []
  const end = reachEnd(doc, from, to)
  for (let p = lineStartAt(doc, from); p <= end; p = lineEndAt(doc, p) + 1) {
    const le = lineEndAt(doc, p)
    out.push({ ls: p, le })
    if (le >= doc.length) break
  }
  return out
}

export function setBlock(scan: DocScan, from: number, to: number, fmt: BlockFormat): FormatEdit {
  const doc = scan.text
  const ls = lineStartAt(doc, from)
  const le = lineEndAt(doc, from)
  const line = doc.slice(ls, le)
  const lead = line.length > 0 ? '\n\n' : ls === 0 || doc.endsWith('\n\n', ls) ? '' : '\n'
  const trail = doc.startsWith('\n\n', le) ? '' : '\n'
  switch (fmt) {
    case 'quote': {
      // Off only where every selected line is already a quote. Toggling a callout head wraps rather than demoting it.
      const lines = spannedLines(doc, from, to)
      const strip = lines.every(({ ls: s, le: e }) => isQuoteToggleable(doc.slice(s, e)))
      const changes: FormatEdit['changes'] = []
      let lastEnd = 0
      const blank = lines.length === 1 ? '> ' : '>'
      for (const { ls: s, le: e } of lines) {
        const text = doc.slice(s, e)
        const cut = s + quotePrefixWidth(text, 1)
        const change = strip
          ? { from: cut + stripQuotePrefix(text).length - text.length, to: cut, insert: '' }
          : { from: s, to: s, insert: text === '' ? blank : '> ' }
        changes.push(change)
        lastEnd = e - (change.to - change.from) + change.insert.length
      }
      return lines.length === 1 ? { changes, selection: lastEnd } : { changes }
    }
    case 'callout': {
      if (isCalloutHead(line)) return { changes: [] }
      const body = stripInnerMarkers(line)
      const next = `> [!callout] ${parseListMarker(line) ? body : stripQuotePrefix(body)}`
      return { changes: [{ from: ls, to: le, insert: next }], selection: ls + next.length }
    }
    case 'code': {
      // Inside a fence, the pick takes its two fence lines off; elsewhere, one fence goes around the whole selection, the gesture for a block of code pasted in.
      const fence = scan.fences[lineIndexAt(scan, from)]
      if (fence) {
        const body = scan.lineStarts[lineIndexAt(scan, fence.from) + 1]
        const close = scan.lineStarts[lineIndexAt(scan, fence.to)]
        return {
          changes: [
            { from: fence.from, to: body, insert: '' },
            { from: Math.max(body, close - 1), to: fence.to, insert: '' },
          ],
        }
      }
      const end = lineEndAt(doc, reachEnd(doc, from, to))
      const body = doc.slice(ls, end)
      const next = `\`\`\`\n${body}\n\`\`\``
      return { changes: [{ from: ls, to: end, insert: next }], selection: ls + 4 + body.length }
    }
    case 'hr': {
      const insert = `${lead}---${trail}`
      return { changes: [{ from: le, to: le, insert }], selection: le + lead.length + 4 }
    }
    case 'table': {
      // A GFM table parses as its own block ONLY when blank lines fence it; without one it merges with an adjacent table below, whose header and delimiter then become body rows.
      const table = serialize(emptyTable(3, 3))
      const insert = `${lead}${table}${trail}`
      return {
        changes: [{ from: le, to: le, insert }],
        selection: le + lead.length + table.length + 1,
      }
    }
  }
}

function stripInnerMarkers(body: string): string {
  const lm = parseListMarker(body)
  if (lm) return body.slice(lm.contentStart)
  const h = headingParts(body)
  return h ? h.indent + h.content : body
}
