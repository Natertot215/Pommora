import { shiftToken, tokenize, type TokenKind } from '../Engine/tokens'
import {
  blockquotePrefixRe,
  headingParts,
  calloutHeadPrefixLen,
  isBlockquoteLine,
  isCalloutHead,
  parseListMarker,
  parseListMarkerPrefixed,
  stripQuotePrefix,
  type ListMarker,
} from '../Engine/detect'
import type { ListKind } from '@pommora/core/Actions/gripMenu'
import { lineStartAt, lineEndAt } from './edits'
import { emptyTable } from '../Engine/Tables/model'
import { serialize } from '../Engine/Tables/codec'

export type InlineFormat = keyof typeof WRAP | 'link' | 'connection'
export type HeadingLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type BlockFormat = 'quote' | 'code' | 'hr' | 'callout' | 'table'

export interface FormatEdit {
  changes: { from: number; to: number; insert: string }[]
  selection?: number
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
  inlineCode: '`',
} as const

export function toggleInline(doc: string, from: number, to: number, fmt: InlineFormat): FormatEdit {
  if (fmt === 'link') return toggleWrap(doc, from, to, 'link', '[', ']()', (_f, t) => t + 3)
  if (fmt === 'connection')
    return toggleWrap(doc, from, to, 'wikiLink', '[[', ']]', (f, t) => (f === t ? f + 2 : t + 2))
  const kind = fmt as keyof typeof WRAP & TokenKind
  // Inline marks are line-local, so only the caret's line is tokenized; the hit is shifted back to document coordinates.
  const ls = lineStartAt(doc, from)
  const found = tokenize(doc.slice(ls, lineEndAt(doc, from))).find(
    (tk) => tk.kind === kind && tk.contentRange[0] <= from - ls && to - ls <= tk.contentRange[1],
  )
  const existing = found ? shiftToken(found, ls) : undefined
  if (existing) {
    const [m0, m1] = existing.markerRanges
    return {
      changes: [
        { from: m0[0], to: m0[1], insert: '' },
        { from: m1[0], to: m1[1], insert: '' },
      ],
      selection: from - (m0[1] - m0[0]),
    }
  }
  const w = WRAP[kind]
  return {
    changes: [
      { from, to: from, insert: w },
      { from: to, to, insert: w },
    ],
    selection: from === to ? from + w.length : to + w.length,
  }
}

function toggleWrap(
  doc: string,
  from: number,
  to: number,
  kind: 'link' | 'wikiLink',
  open: string,
  close: string,
  caret: (from: number, to: number) => number,
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

function listMarkerText(kind: ListKind, n = 1): string {
  switch (kind) {
    case 'ordered':
      return `${n}. `
    case 'checkbox':
      return '- [ ] '
    case 'arrow':
      return '→ '
    case 'bullet':
      return '- '
  }
}

/** For a callout HEAD the chrome includes the hidden `[!type] ` tag. Block transforms edit from AFTER the chrome, which preserves the box and keeps the change out of the callout guard's window. */
export function splitPrefix(line: string): { prefix: string; body: string } {
  const headLen = calloutHeadPrefixLen(line)
  if (headLen !== null) return { prefix: line.slice(0, headLen), body: line.slice(headLen) }
  if (isBlockquoteLine(line)) {
    const p = blockquotePrefixRe.exec(line)?.[0] ?? ''
    return { prefix: p, body: line.slice(p.length) }
  }
  return { prefix: '', body: line }
}

/** Prefix-aware: `> - item` becomes `> ## item`, never `## - item` popped out of its quote. Blank lines keep their seats. */
export function setHeading(doc: string, from: number, to: number, level: HeadingLevel): FormatEdit {
  const lines = selectedLines(doc, from, to)
  if (lines.length === 0) return { changes: [] }
  const changes: FormatEdit['changes'] = []
  let lastEnd = 0
  for (const l of lines) {
    const next = `${l.pad}${level === 0 ? l.inner : `${'#'.repeat(level)} ${l.inner}`}`
    changes.push({ from: l.ls + l.prefix.length, to: l.le, insert: next })
    lastEnd = l.ls + l.prefix.length + next.length
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
  kind: ListKind | null
  level: number
}

function selectedLines(doc: string, from: number, to: number): SelectedLine[] {
  const out: SelectedLine[] = []
  for (let p = lineStartAt(doc, from); p <= to; p = lineEndAt(doc, p) + 1) {
    const ls = p
    const le = lineEndAt(doc, p)
    const { prefix, body } = splitPrefix(doc.slice(ls, le))
    if (body.trim() !== '' || from === to) {
      const lm = parseListMarker(body)
      const stripped = stripInnerMarkers(body)
      // An item's indent sits before its marker, a paragraph's leads its words — held apart either way, so converting a nested item keeps its level.
      const indent =
        body.trim() === ''
          ? ''
          : lm
            ? body.slice(0, lm.markerStart)
            : stripped.slice(0, stripped.search(/\S|$/))
      out.push({
        ls,
        le,
        prefix,
        pad: prefix !== '' && !/[ \t]$/.test(prefix) ? ' ' : '',
        indent,
        inner: lm ? stripped : stripped.trimStart(),
        kind: lm?.kind ?? null,
        level: lm?.level ?? 0,
      })
    }
    if (le >= doc.length) break
  }
  return out
}

/** A mixed block becomes one list rather than half a list. Ordered runs count per indent level. */
export function setList(doc: string, from: number, to: number, kind: ListKind): FormatEdit {
  const lines = selectedLines(doc, from, to)
  if (lines.length === 0) return { changes: [] }
  const strip = lines.every((l) => l.kind === kind)
  const counters: number[] = []
  const changes: FormatEdit['changes'] = []
  let lastEnd = 0
  for (const l of lines) {
    counters.length = l.level + 1
    counters[l.level] = (counters[l.level] ?? 0) + 1
    const marker = strip ? '' : listMarkerText(kind, counters[l.level])
    const next = `${l.pad}${l.indent}${marker}${l.inner}`
    changes.push({ from: l.ls + l.prefix.length, to: l.le, insert: next })
    lastEnd = l.ls + l.prefix.length + next.length
  }
  // One line keeps the caret at its end; across several the selection maps through the edits so it still covers what it covered.
  return lines.length === 1 ? { changes, selection: lastEnd } : { changes }
}

/** Read prefixed, matching the resolver that decided these lines were one list, so a quoted item's marker is found behind its `>`. */
function listMarkerLines(
  doc: string,
  from: number,
  to: number,
): { start: number; marker: ListMarker }[] {
  const out: { start: number; marker: ListMarker }[] = []
  for (let p = from; p <= to; p = lineEndAt(doc, p) + 1) {
    const marker = parseListMarkerPrefixed(doc.slice(p, lineEndAt(doc, p)))
    if (marker) out.push({ start: p, marker })
  }
  return out
}

export function listKindOf(doc: string, from: number, to: number): ListKind | null {
  let kind: ListKind | null = null
  for (const { marker } of listMarkerLines(doc, from, to)) {
    if (kind !== null && kind !== marker.kind) return null
    kind = marker.kind
  }
  return kind
}

/** A marker that already reads as it should yields no edit, so picking Numbered over a broken sequence repairs it. */
export function setListKind(doc: string, from: number, to: number, kind: ListKind): FormatEdit {
  const counters: number[] = []
  const changes: FormatEdit['changes'] = []
  for (const { start, marker } of listMarkerLines(doc, from, to)) {
    counters.length = marker.level + 1
    counters[marker.level] = (counters[marker.level] ?? 0) + 1
    const end = start + marker.contentStart
    const next =
      doc.slice(start, start + marker.markerStart) + listMarkerText(kind, counters[marker.level])
    if (doc.slice(start, end) !== next) changes.push({ from: start, to: end, insert: next })
  }
  return { changes }
}

/** Quoting is the one line transform a blank line belongs in: a bare `>` is the quote's own empty line, and skipping it splits the block. */
function spannedLines(doc: string, from: number, to: number): { ls: number; le: number }[] {
  const out: { ls: number; le: number }[] = []
  for (let p = lineStartAt(doc, from); p <= to; p = lineEndAt(doc, p) + 1) {
    const le = lineEndAt(doc, p)
    out.push({ ls: p, le })
    if (le >= doc.length) break
  }
  return out
}

export function setBlock(doc: string, from: number, to: number, fmt: BlockFormat): FormatEdit {
  const ls = lineStartAt(doc, from)
  const le = lineEndAt(doc, from)
  const line = doc.slice(ls, le)
  switch (fmt) {
    case 'quote': {
      // Off only where every selected line is already a quote. Toggling a callout head wraps rather than demoting it.
      const lines = spannedLines(doc, from, to)
      const strip = lines.every(({ ls: s, le: e }) => isQuoteToggleable(doc.slice(s, e)))
      const changes: FormatEdit['changes'] = []
      let lastEnd = 0
      for (const { ls: s, le: e } of lines) {
        const text = doc.slice(s, e)
        // A blank line takes the bare `>` that keeps the quote one block; trailing whitespace would be all that marker carried.
        const next = strip ? stripQuotePrefix(text) : text === '' ? '>' : `> ${text}`
        changes.push({ from: s, to: e, insert: next })
        lastEnd = s + next.length
      }
      return lines.length === 1 ? { changes, selection: lastEnd } : { changes }
    }
    case 'callout': {
      if (isCalloutHead(line)) return { changes: [] }
      const next = `> [!callout] ${stripBlockMarkers(line)}`
      return { changes: [{ from: ls, to: le, insert: next }], selection: ls + next.length }
    }
    case 'code': {
      // One fence around the whole selection: a block of code pasted in and then fenced is the gesture this exists for.
      const end = lineEndAt(doc, to)
      const body = doc.slice(ls, end)
      const next = `\`\`\`\n${body}\n\`\`\``
      return { changes: [{ from: ls, to: end, insert: next }], selection: ls + 4 + body.length }
    }
    case 'hr': {
      const insert = line.length === 0 ? '---' : `${line}\n\n---\n`
      return { changes: [{ from: ls, to: le, insert }], selection: ls + insert.length }
    }
    case 'table': {
      // A GFM table parses as its own block ONLY when blank lines fence it; without one it merges with an adjacent table below, whose header and delimiter then become body rows.
      const table = serialize(emptyTable(3, 3))
      const before = doc.slice(0, ls)
      const after = doc.slice(le)
      const lead = line.length > 0 ? `${line}\n\n` : ls === 0 || before.endsWith('\n\n') ? '' : '\n'
      const trail =
        after.startsWith('\n') && !after.startsWith('\n\n') && after.length > 1 ? '\n' : ''
      const insert = `${lead}${table}${trail}`
      return { changes: [{ from: ls, to: le, insert }], selection: ls + insert.length }
    }
  }
}

function stripInnerMarkers(body: string): string {
  const lm = parseListMarker(body)
  if (lm) return body.slice(lm.contentStart)
  const h = headingParts(body)
  return h ? h.indent + h.content : body
}

function stripBlockMarkers(line: string): string {
  const lm = parseListMarker(line)
  if (lm) return line.slice(lm.contentStart)
  const h = headingParts(line)
  return stripQuotePrefix(h ? h.indent + h.content : line)
}
