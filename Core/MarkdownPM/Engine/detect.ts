// Inline matchers return a fresh /g regex per call so callers never share lastIndex.
import { perText } from './perText'
import { parse } from './parser'
import { fenceLang, fenceSpans, lineEndOf, lineOffsetsOf, type CodeMask } from './markdownCode'
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
    const { open, close } = span
    const base = {
      from: lineStarts[open],
      to: lineEndOf({ lines, lineStarts }, close),
      depth: span.fence.depth,
      lang: fenceLang(span.fence) || undefined,
      markerEnd: span.fence.markerEnd,
    }
    out[open] = { role: 'open', ...base }
    for (let k = open + 1; k < close; k++) out[k] = { role: 'content', ...base, ordinal: k - open }
    out[close] = { role: 'close', ...base }
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
  d: DocLines,
  excluded: [number, number][],
): { ranges: [number, number][]; open: number } {
  const { lines, lineStarts } = d
  const ranges: [number, number][] = []
  let open = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '$$') continue
    if (inExcluded(lineStarts[i], excluded)) continue
    if (open < 0) {
      open = i
    } else {
      ranges.push([lineStarts[open], lineEndOf(d, i)])
      open = -1
    }
  }
  return { ranges, open }
}

const HTML_RAW: [RegExp, RegExp][] = [
  [/^ {0,3}<(?:script|pre|style|textarea)(?:[ \t>]|$)/i, /<\/(?:script|pre|style|textarea)>/i],
  [/^ {0,3}<!--/, /-->/],
  [/^ {0,3}<\?/, /\?>/],
  [/^ {0,3}<![A-Za-z]/, />/],
  [/^ {0,3}<!\[CDATA\[/, /\]\]>/],
]
const HTML_OPEN = /^ {0,3}<[A-Za-z/!?]/

export function htmlBlocks(
  d: DocLines,
  fences: readonly (FenceInfo | undefined)[],
): [number, number][] {
  const { lines, lineStarts } = d
  const out: [number, number][] = []
  for (let i = 0; i < lines.length; i++) {
    if (fences[i] || !HTML_OPEN.test(lines[i])) continue
    let j = i
    for (let k = i; k < lines.length && (k <= j || lines[k].trim() !== ''); k++) {
      const end = HTML_RAW.find(([open]) => open.test(lines[k]))?.[1]
      let e = k
      if (end) while (e < lines.length - 1 && !end.test(lines[e])) e++
      j = Math.max(j, e)
    }
    out.push([lineStarts[i], lineEndOf(d, j)])
    i = j
  }
  return out
}

function loneLines<T>(
  d: DocLines,
  excluded: [number, number][],
  read: (line: string) => T | null,
): (T & { from: number; to: number })[] {
  const { lines, lineStarts } = d
  const out: (T & { from: number; to: number })[] = []
  for (let i = 0; i < lines.length; i++) {
    const v = read(lines[i])
    if (v === null || inExcluded(lineStarts[i], excluded)) continue
    out.push({ ...v, from: lineStarts[i], to: lineEndOf(d, i) })
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

export interface LineRef {
  col: number
  end: number
  label: string
}

export function lineRefs(line: string, lineStart: number, inCode: CodeMask): LineRef[] | undefined {
  if (!line.includes('[^')) return undefined
  const headEnd = citationHeadRe.exec(line)?.[0].length
  let out: LineRef[] | undefined
  for (const m of line.matchAll(markerRegex())) {
    const end = m.index + m[0].length
    if (headEnd !== undefined && end <= headEnd) continue
    // A marker inside code binds nothing and takes no number — counting them here would print numbers that skip.
    if (inCode(lineStart + m.index)) continue
    out ??= []
    out.push({ col: m.index, end, label: m[1] })
  }
  return out
}

const CONTINUATION_INDENT = /^(?: {4}|\t)/

export function citationEntries(d: DocLines, excluded: (line: number) => boolean): CitationEntry[] {
  const { lines, lineStarts } = d
  const blank = (k: number): boolean => lines[k].trim() === ''
  const breaks = (k: number): boolean =>
    excluded(k) ||
    isHeadingLine(lines[k]) ||
    isThematicBreakLine(lines[k]) ||
    isBlockquoteLine(lines[k]) ||
    parseListMarker(lines[k]) !== null
  const aboveBlanks = (k: number): number => {
    let p = k
    while (p >= 0 && blank(p)) p--
    return p
  }
  const headOf = (end: number): number => {
    let h = end
    while (!citationHeadRe.test(lines[h])) {
      if (breaks(h)) return -1
      const p = aboveBlanks(h - 1)
      if (p < 0 || (p < h - 1 && !CONTINUATION_INDENT.test(lines[h]))) return -1
      h = p
    }
    return excluded(h) ? -1 : h
  }

  const entries: CitationEntry[] = []
  for (let end = aboveBlanks(lines.length - 1); end >= 0; ) {
    const h = headOf(end)
    if (h < 0) break
    const head = citationHeadRe.exec(lines[h])!
    entries.push({
      line: h,
      lastLine: end,
      label: head[1],
      contentStart: lineStarts[h] + head[0].length,
      ordinal: null,
    })
    end = aboveBlanks(h - 1)
  }
  return entries.reverse()
}

export function assembleCitations(
  d: DocLines,
  excluded: (line: number) => boolean,
  refs: readonly (LineRef[] | undefined)[],
): CitationScan {
  const { lines, lineStarts } = d
  const entries = citationEntries(d, excluded)
  const firstLine = entries[0]?.line ?? lines.length
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
    const onLine = refs[i]
    if (!onLine) continue
    const held: MarkerRef[] = []
    for (const r of onLine) {
      const entry = firstFor.get(foldLabel(r.label))
      if (entry && entry.ordinal === null) entry.ordinal = next++
      const ref: MarkerRef = {
        line: i,
        from: lineStarts[i] + r.col,
        to: lineStarts[i] + r.end,
        label: r.label,
        ordinal: entry?.ordinal ?? null,
      }
      markers.push(ref)
      held.push(ref)
    }
    markersAt.set(i, held)
  }

  return {
    entries,
    markers,
    entryAt,
    markersAt,
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

/** A `[!type]` lookalike inside a fence is code, never a head. */
export function calloutLines(
  lines: string[],
  fences: (FenceInfo | undefined)[],
): (CalloutLine | undefined)[] {
  const codeLine = (k: number): boolean => fences[k]?.role === 'content'
  const out: (CalloutLine | undefined)[] = new Array(lines.length)
  let i = 0
  while (i < lines.length) {
    if (!isCalloutHead(lines[i]) || codeLine(i)) {
      i++
      continue
    }
    let j = i + 1
    while (
      j < lines.length &&
      isBlockquoteLine(lines[j]) &&
      !(isCalloutHead(lines[j]) && !codeLine(j))
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

// A table cell reads the list vocabulary and nothing else: a `#`, a fence, a quote marker and a rule are literal text there, so every reader that walks a line takes the scope it is walking for.
export type MarkdownScope = 'page' | 'cell'

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
  ordinal?: string
  level: number
  markerStart: number
  markerEnd: number
  contentStart: number
  box?: { start: number; end: number; inner: string }
  checked?: boolean
}

// `-` and `+` are the only bullet characters: `*` and `•` stay prose, or the drag layer is handed items nothing draws.
const LIST_MARKER_RE = /^([ \t]*)(?:(\d+|[A-Z])\.|([-+]))(?:[ \t]*(\[([ xX]?)\]))?([ \t]+)(.*)$/d
const ARROW_MARKER_RE = /^([ \t]*)→([ \t]+)/

type SequencedKind = Extract<ListKind, 'ordered' | 'alphabetical'>

export const isSequenced = (kind: ListKind): kind is SequencedKind =>
  kind === 'ordered' || kind === 'alphabetical'

export const ordinalOf = (lm: ListMarker): number =>
  lm.kind === 'alphabetical'
    ? (lm.ordinal ?? 'A').charCodeAt(0) - 64
    : parseInt(lm.ordinal ?? '0', 10)

// An alphabetical run past Z starts over at A.
export const ordinalText = (kind: SequencedKind, n: number): string =>
  kind === 'alphabetical' ? String.fromCharCode(65 + ((n - 1) % 26)) : String(n)

export const nestedUnder = (line: string, indent: string): boolean =>
  line.trim() !== '' && line.startsWith(indent) && /^[ \t]/.test(line.slice(indent.length))

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
      kind: /\d/.test(m[2]) ? 'ordered' : 'alphabetical',
      ordinal: m[2],
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

// KNOB — distinct lines each predicate remembers.
const LINE_CAP = 4096
const parsesTo = (type: string): ((line: string) => boolean) =>
  perText((line) => parse(line).children.some((n) => n.type === type), LINE_CAP)
const parsesThematicBreak = parsesTo('thematicBreak')
const parsesHeading = parsesTo('heading')
const parsesBlockquote = parsesTo('blockquote')

export function isThematicBreakLine(line: string): boolean {
  return thematicBreakPrefilter.test(line) && parsesThematicBreak(line)
}

export function isHeadingLine(line: string): boolean {
  return headingPrefilter.test(line) && parsesHeading(line)
}

const headingPartsRe = /^([ ]{0,3})(#{1,6})([ \t]+)(.*)$/
export function headingParts(
  line: string,
): { indent: string; hashes: string; space: string; content: string } | null {
  const m = headingPartsRe.exec(line)
  return m ? { indent: m[1], hashes: m[2], space: m[3], content: m[4] } : null
}

export function isBlockquoteLine(line: string): boolean {
  return blockquotePrefilter.test(line) && parsesBlockquote(line)
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
