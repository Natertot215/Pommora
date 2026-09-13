// Inline matchers return a fresh /g regex per call so callers never share lastIndex.
import { parse } from './parser'
import { codeMask, fenceLang, fenceSpans, lineOffsetsOf, type CodeMask } from './markdownCode'
import { loneWebpageEmbed } from '@pommora/core/MarkdownPM/Embeds/webpageEmbed'
import type { ListKind } from '@pommora/core/Actions/gripMenu'
export const highlightRegex = (): RegExp => /(?<!=)==(?!=)((?:[^=\n]|=(?!=))+)==(?!=)/dg
export const inlineLatexRegex = (): RegExp => /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/dg

export const blockquotePrefixRe = /^[ \t]*(?:>[ \t]?)+/

export const oneQuoteLevelRe = /^([ \t]*)>[ \t]?/
export function stripQuotePrefix(line: string): string {
  return line.replace(oneQuoteLevelRe, '$1')
}

export interface FenceInfo {
  role: 'open' | 'content' | 'close'
  from: number
  to: number
  depth: number
  closed: boolean
  lang?: string
  markerEnd: number
  ordinal?: number
}

export interface DocLines {
  text: string
  lines: string[]
  lineStarts: number[]
}

export function splitWithOffsets(text: string): DocLines {
  const lines = text.split('\n')
  const lineStarts = lineOffsetsOf(lines)
  lineStarts.push(text.length)
  return { text, lines, lineStarts }
}

export function scanFencedCode(lines: string[], lineStarts: number[]): (FenceInfo | undefined)[] {
  const out: (FenceInfo | undefined)[] = new Array(lines.length)
  for (const span of fenceSpans(lines)) {
    const { open, close, closed } = span
    const base = {
      from: lineStarts[open],
      to: lineStarts[close] + lines[close].length,
      depth: span.fence.depth,
      closed,
      lang: fenceLang(span.fence) || undefined,
      markerEnd: span.fence.markerEnd,
    }
    out[open] = { role: 'open', ...base }
    const contentEnd = closed ? close : close + 1
    for (let k = open + 1; k < contentEnd; k++)
      out[k] = { role: 'content', ...base, ordinal: k - open }
    if (closed) out[close] = { role: 'close', ...base }
  }
  return out
}

export function fenceRangesOf(fences: readonly (FenceInfo | undefined)[]): [number, number][] {
  const out: [number, number][] = []
  for (const f of fences) if (f?.role === 'open') out.push([f.from, f.to])
  return out
}

const inExcluded = (at: number, excluded: [number, number][]): boolean =>
  excluded.some(([f, t]) => at >= f && at <= t)

/** A LONE `$$` line opens and the next lone `$$` closes — never the token layer's lazy span regex, which one stray `$$` would flip. */
export function blockMathRanges(
  { lines, lineStarts }: DocLines,
  excluded: [number, number][],
): [number, number][] {
  const out: [number, number][] = []
  let open = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '$$') continue
    if (inExcluded(lineStarts[i], excluded)) continue
    if (open < 0) {
      open = i
    } else {
      out.push([lineStarts[open], lineStarts[i] + lines[i].length])
      open = -1
    }
  }
  return out
}

function loneLines<T>(
  { lines, lineStarts }: DocLines,
  excluded: [number, number][],
  read: (line: string) => T | null,
): (T & { from: number; to: number })[] {
  const out: (T & { from: number; to: number })[] = []
  for (let i = 0; i < lines.length; i++) {
    const v = read(lines[i])
    if (v === null || inExcluded(lineStarts[i], excluded)) continue
    out.push({ ...v, from: lineStarts[i], to: lineStarts[i] + lines[i].length })
  }
  return out
}

export interface CitationEntry {
  line: number
  lastLine: number
  label: string
  contentStart: number
  ordinal: number | null
}

export interface MarkerRef {
  line: number
  from: number
  to: number
  label: string
  ordinal: number | null
}

export interface CitationScan {
  entries: CitationEntry[]
  markers: MarkerRef[]
  mask: Uint8Array
  /** Indexes over the arrays above rather than copies: filtering the flat lists per line is the cost the one-scan discipline avoids. */
  entryAt: Map<number, CitationEntry>
  markersAt: Map<number, MarkerRef[]>
  firstLine: number
  anchorLine: number
}

// The label admits neither `]` nor whitespace, which separates a citation from the `[^my note]:` link definition.
const citationHeadRe = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]*/

/** Fresh per call so no caller shares `lastIndex`. The lookbehind honors the `\[^1]` escape, which suppresses the reference at the parser too. */
export const markerRegex = (): RegExp => /(?<!\\)\[\^([^\]\s]+)\]/dg

export function markerEndingAt(text: string): string | null {
  const last = [...text.matchAll(markerRegex())].at(-1)
  return last && last.index + last[0].length === text.length ? last[1] : null
}

/** Not the shared title normalization: GFM defines its own folding, and coupling them would let title matching move footnote binding. */
export function foldLabel(label: string): string {
  return label.toLowerCase().toUpperCase()
}

export function citationScan(
  d: DocLines,
  excluded: [number, number][],
  inCode: CodeMask = codeMask(d.text),
): CitationScan {
  const { lines, lineStarts } = d
  const blank = (k: number): boolean => lines[k].trim() === ''
  const breaks = (k: number): boolean =>
    inExcluded(lineStarts[k], excluded) ||
    isHeadingLine(lines[k]) ||
    isThematicBreakLine(lines[k]) ||
    isBlockquoteLine(lines[k]) ||
    parseListMarker(lines[k]) !== null

  const spans: Omit<CitationEntry, 'ordinal'>[] = []
  for (let i = 0; i < lines.length; i++) {
    const head = citationHeadRe.exec(lines[i])
    if (!head || inExcluded(lineStarts[i], excluded)) continue
    let lastLine = i
    let k = i + 1
    while (k < lines.length) {
      let m = k
      while (m < lines.length && blank(m)) m++
      if (m >= lines.length || citationHeadRe.test(lines[m]) || breaks(m)) break
      if (m > k && !/^(?: {4}|\t)/.test(lines[m])) break
      lastLine = m
      k = m + 1
    }
    spans.push({
      line: i,
      lastLine,
      label: head[1],
      contentStart: lineStarts[i] + head[0].length,
    })
    i = lastLine
  }

  const mask = new Uint8Array(lines.length)
  let firstLine = lines.length
  let entries: CitationEntry[] = []
  const allBlank = (from: number, to: number): boolean => {
    for (let k = from; k <= to; k++) if (!blank(k)) return false
    return true
  }
  const last = spans[spans.length - 1]
  if (last && allBlank(last.lastLine + 1, lines.length - 1)) {
    let start = spans.length - 1
    while (start > 0 && allBlank(spans[start - 1].lastLine + 1, spans[start].line - 1)) start--
    firstLine = spans[start].line
    entries = spans.slice(start).map((s) => ({ ...s, ordinal: null }))
    mask.fill(1, firstLine)
  }

  // A marker inside code binds nothing and takes no number — counting them here would print numbers that skip.
  const firstFor = new Map<string, CitationEntry>()
  for (const e of entries) {
    const key = foldLabel(e.label)
    if (!firstFor.has(key)) firstFor.set(key, e)
  }
  const entryAt = new Map<number, CitationEntry>()
  for (const e of entries) for (let k = e.line; k <= e.lastLine; k++) entryAt.set(k, e)

  const markers: MarkerRef[] = []
  const markersAt = new Map<number, MarkerRef[]>()
  let next = 1
  for (let i = 0; i < firstLine; i++) {
    const headEnd = citationHeadRe.exec(lines[i])?.[0].length
    const re = markerRegex()
    let m = re.exec(lines[i])
    for (; m !== null; m = re.exec(lines[i])) {
      const from = lineStarts[i] + m.index
      if (headEnd !== undefined && m.index + m[0].length <= headEnd) continue
      if (inCode(from)) continue
      const entry = firstFor.get(foldLabel(m[1]))
      if (entry && entry.ordinal === null) entry.ordinal = next++
      const ref: MarkerRef = {
        line: i,
        from,
        to: from + m[0].length,
        label: m[1],
        ordinal: entry?.ordinal ?? null,
      }
      markers.push(ref)
      const onLine = markersAt.get(i)
      if (onLine) onLine.push(ref)
      else markersAt.set(i, [ref])
    }
  }

  return {
    entries,
    markers,
    entryAt,
    markersAt,
    mask,
    firstLine,
    anchorLine: entries.length > 0 && firstLine > 0 ? firstLine - 1 : -1,
  }
}

const boundTo = (label: string): ((x: { label: string }) => boolean) => {
  const key = foldLabel(label)
  return (x) => foldLabel(x.label) === key
}

export const citationsFor = (c: CitationScan, label: string): CitationEntry[] =>
  c.entries.filter(boundTo(label))

export const citationFor = (c: CitationScan, label: string): CitationEntry | undefined =>
  c.entries.find(boundTo(label))

export const markersFor = (c: CitationScan, label: string): MarkerRef[] =>
  c.markers.filter(boundTo(label))

export const isLastReference = (c: CitationScan, marker: MarkerRef): boolean =>
  markersFor(c, marker.label).every((m) => m === marker)

export const lineEndOf = (d: { lines: string[]; lineStarts: number[] }, line: number): number =>
  d.lineStarts[line] + d.lines[line].length

export interface EmbedLine {
  from: number
  to: number
  title: string
}

const loneEmbedRe = /^!\[\[([^\]\r\n]*)\]\][ \t]*$/

export function loneEmbedTitle(line: string): string | null {
  return loneEmbedRe.exec(line)?.[1] ?? null
}

/** Trailing whitespace doesn't break lone-ness, but a leading indent does — an indented line is a list continuation. */
export function blockEmbedLines(d: DocLines, excluded: [number, number][]): EmbedLine[] {
  return loneLines(d, excluded, (line) => {
    const title = loneEmbedTitle(line)
    return title === null ? null : { title }
  })
}

export interface WebpageLine {
  from: number
  to: number
  label: string
  url: string
}

export function blockWebpageLines(d: DocLines, excluded: [number, number][]): WebpageLine[] {
  return loneLines(d, excluded, loneWebpageEmbed)
}

// Per-HEAD, not per-run: any `[!type]` line starts its own callout, so pasted heads never merge into one box with a raw tag.
const calloutTagRe = /^\[!([a-zA-Z][\w-]*)\][ \t]?/

export function isCalloutHead(line: string): boolean {
  return calloutHeadPrefixLen(line) !== null
}

export interface CalloutLine {
  first: boolean
  last: boolean
  prefixEnd: number
}

/** A `[!type]` lookalike inside a CLOSED fence is code, never a head. Callers holding a fence scan pass it. */
export function calloutLines(
  lines: string[],
  fences: (FenceInfo | undefined)[] = scanFencedCode(lines, lineOffsetsOf(lines)),
): (CalloutLine | undefined)[] {
  const codeAt = (k: number): boolean => {
    const f = fences[k]
    return f?.closed === true && f.role === 'content'
  }
  const out: (CalloutLine | undefined)[] = new Array(lines.length)
  let i = 0
  while (i < lines.length) {
    if (!isCalloutHead(lines[i]) || codeAt(i)) {
      i++
      continue
    }
    let j = i + 1
    while (
      j < lines.length &&
      isBlockquoteLine(lines[j]) &&
      !(isCalloutHead(lines[j]) && !codeAt(j))
    )
      j++
    const headPrefix = blockquotePrefixRe.exec(lines[i])?.[0] ?? ''
    const tag = calloutTagRe.exec(lines[i].slice(headPrefix.length))
    for (let k = i; k < j; k++) {
      const oneLevel = oneQuoteLevelRe.exec(lines[k])?.[0].length ?? 0
      out[k] = {
        first: k === i,
        last: k === j - 1,
        prefixEnd: k === i ? headPrefix.length + (tag?.[0].length ?? 0) : oneLevel,
      }
    }
    i = j
  }
  return out
}

export function calloutHeadPrefixLen(line: string): number | null {
  const pfx = blockquotePrefixRe.exec(line)?.[0]
  if (!pfx || !isBlockquoteLine(line)) return null
  const tag = calloutTagRe.exec(line.slice(pfx.length))
  return tag ? pfx.length + tag[0].length : null
}

export const MAX_NESTING_LEVEL = 3

export function indentLevel(ws: string): number {
  let tabs = 0
  let spaces = 0
  for (const ch of ws) ch === '\t' ? tabs++ : spaces++
  return Math.min(MAX_NESTING_LEVEL, tabs + Math.floor(spaces / 2))
}

export interface ListMarker {
  kind: ListKind
  bullet?: string
  digits?: string
  level: number
  markerStart: number
  markerEnd: number
  contentStart: number
  box?: { start: number; end: number; inner: string }
  checked?: boolean
}

// `-` and `+` are the only bullet characters: `*` and `•` stay prose, or the drag layer is handed items nothing draws.
const LIST_MARKER_RE = /^([ \t]*)(?:(\d+)\.|([-+]))(?:[ \t]*(\[([ xX]?)\]))?([ \t]+)(.*)$/d
const ARROW_MARKER_RE = /^([ \t]*)→([ \t]+)/

export function parseListMarker(line: string): ListMarker | null {
  const arrow = ARROW_MARKER_RE.exec(line)
  if (arrow) {
    const markerStart = arrow[1].length
    return {
      kind: 'arrow',
      bullet: '→',
      level: indentLevel(arrow[1]),
      markerStart,
      markerEnd: markerStart + 1,
      contentStart: markerStart + 1 + arrow[2].length,
    }
  }
  const m = LIST_MARKER_RE.exec(line)
  const idx = m?.indices
  const ws = idx?.[6]
  if (!m || !idx || !ws) return null
  const indent = m[1]
  const markerStart = indent.length
  const level = indentLevel(indent)
  const contentStart = ws[1]
  const b = idx[4]
  const box = b ? { start: b[0], end: b[1], inner: m[5] ?? '' } : undefined
  const bullet = m[3]

  if (bullet !== undefined && box && box.inner !== '') {
    return {
      kind: 'checkbox',
      bullet,
      level,
      markerStart,
      markerEnd: box.end,
      contentStart,
      box,
      checked: box.inner !== ' ',
    }
  }
  if (m[2] !== undefined) {
    return {
      kind: 'ordered',
      digits: m[2],
      level,
      markerStart,
      markerEnd: markerStart + m[2].length + 1,
      contentStart,
      box,
    }
  }
  return {
    kind: 'bullet',
    bullet,
    level,
    markerStart,
    markerEnd: markerStart + (bullet?.length ?? 1),
    contentStart,
    box,
  }
}

export function parseListMarkerPrefixed(line: string): ListMarker | null {
  const pfx = blockquotePrefixRe.exec(line)?.[0]
  if (!pfx || !isBlockquoteLine(line)) return parseListMarker(line)
  const lm = parseListMarker(line.slice(pfx.length))
  if (!lm) return null
  const s = pfx.length
  return {
    ...lm,
    markerStart: lm.markerStart + s,
    markerEnd: lm.markerEnd + s,
    contentStart: lm.contentStart + s,
    box: lm.box ? { ...lm.box, start: lm.box.start + s, end: lm.box.end + s } : undefined,
  }
}

const headingPrefilter = /^[ ]{0,3}#{1,6}([ \t]|$)/
const blockquotePrefilter = /^[ \t]*>+([ \t]|$)/
// A first-character test would pay a full parse for every `- item`, which is what made a bulleted page the expensive case.
const thematicBreakPrefilter = /^[ ]{0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/

export function isThematicBreakLine(line: string): boolean {
  if (!thematicBreakPrefilter.test(line)) return false
  return parse(line).children.some((n) => n.type === 'thematicBreak')
}

export function isHeadingLine(line: string): boolean {
  if (!headingPrefilter.test(line)) return false
  return parse(line).children.some((n) => n.type === 'heading')
}

const headingPartsRe = /^([ ]{0,3})(#{1,6})([ \t]+)(.*)$/
export function headingParts(
  line: string,
): { indent: string; hashes: string; space: string; content: string } | null {
  const m = headingPartsRe.exec(line)
  return m ? { indent: m[1], hashes: m[2], space: m[3], content: m[4] } : null
}

export function isBlockquoteLine(line: string): boolean {
  if (!blockquotePrefilter.test(line)) return false
  return parse(line).children.some((n) => n.type === 'blockquote')
}

export function isInlineMathContent(content: string): boolean {
  if (/^[+-]?(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?$/.test(content)) return false
  const mathyCount = (content.match(/[\\^_{}=+\-*/<>]/g) ?? []).length
  if (mathyCount === 0) return /^[A-Za-z]{1,3}$/.test(content)
  const tokens = content.split(/\s+/).filter(Boolean).length
  if (mathyCount >= 3) return tokens <= 120
  if (mathyCount === 2) return tokens <= 40
  return tokens <= 6
}
