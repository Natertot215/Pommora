// Inline matchers return a fresh /g regex per call so callers never share lastIndex.
import { parse } from '../parser'
import { codeMask, fenceLang, fenceSpans, lineOffsetsOf, quoteDepthOf } from '@shared/markdownCode'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import type { ListKind } from '@shared/gripMenu'
export { markdownLinkRegex } from '@shared/links'

export type { ListKind }

export const embedRegex = (): RegExp => /!\[\[([^\]\r\n]*)\]\]/dg
export const inlineCodeRegex = (): RegExp => /`([^`\n]+)`/dg
export const blockLatexRegex = (): RegExp => /(?<!\$)\$\$([\s\S]+?)\$\$/dg
export const inlineLatexRegex = (): RegExp => /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/dg

export const blockquotePrefixRe = /^[ \t]*(?:>[ \t]?)+/

/** Strip ONE `>` level (with its optional single space), preserving leading indent. The single source for
 *  un-quoting a line — a deeper `> > …` keeps its inner `>`. */
const oneQuoteLevelRe = /^([ \t]*)>[ \t]?/
export function stripQuotePrefix(line: string): string {
  return line.replace(oneQuoteLevelRe, '$1')
}

/** The shared line-table and quote-depth primitives under this module's names — every doc-walking layer
 *  reaches them through `detect`, but `@shared/markdownCode` is where they're defined. */
export const quoteDepth = quoteDepthOf
export const lineOffsets = lineOffsetsOf

export interface FenceInfo {
  role: 'open' | 'content' | 'close'
  from: number
  to: number
  /** The block's quote depth (from its opening fence) — 0 = an unquoted, top-level block. */
  depth: number
  /** False while the fence is still being typed — an unclosed block claims every line to EOF, so
   *  treating it as settled code would restyle the whole document below the caret. */
  closed: boolean
  /** The opening fence's info word (```yaml → 'yaml') — absent on a bare fence. */
  lang?: string
  /** Where the OPEN line's marker run ends (its whitespace/quote prefix plus the run, line-relative) —
   *  the info word starts here, whatever the fence's indent and however long its run. */
  markerEnd: number
  /** A content line's 1-based number within its block — the line-count chrome's source. */
  ordinal?: number
}

/** The document's line table, computed once and passed down rather than re-derived per scanner.
 *  `lineStarts` carries one entry past the last line, holding the document's end — a walk that runs
 *  off the bottom of `lines` still lands on a real position, and the empty slice it names is the
 *  correct answer for "everything from here on is already accounted for". */
export interface DocLines {
  text: string
  lines: string[]
  lineStarts: number[]
}

export function splitWithOffsets(text: string): DocLines {
  const lines = text.split('\n')
  const lineStarts = lineOffsets(lines)
  lineStarts.push(text.length)
  return { text, lines, lineStarts }
}

/** Every line's role inside its fenced block, in this module's offset-bearing shape. The pairing
 *  itself is `fenceSpans` in the shared code module — the one pass both processes read, so the
 *  renderer and the rename mask can never disagree about where a code block ends. */
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
    const contentEnd = closed ? close : close + 1 // unclosed → the last line is content too
    for (let k = open + 1; k < contentEnd; k++)
      out[k] = { role: 'content', ...base, ordinal: k - open }
    if (closed) out[close] = { role: 'close', ...base }
  }
  return out
}

/** The fence blocks' absolute ranges, read back off the per-line scan — an open line carries its
 *  whole block's extent, so the ranges are already in hand wherever the scan is. The decoration
 *  builder drops inline tokens landing inside a fence opened above the viewport, which a
 *  viewport-only tokenize cannot see. `to` reaches the closing fence line's end, or EOF when the
 *  fence is unclosed. */
export function fenceRangesOf(fences: readonly (FenceInfo | undefined)[]): [number, number][] {
  const out: [number, number][] = []
  for (const f of fences) if (f?.role === 'open') out.push([f.from, f.to])
  return out
}

/** Whether a line start falls inside one of the excluded regions — the one shared reading of the
 *  exclusion contract every block scanner in this file applies. */
const inExcluded = (at: number, excluded: [number, number][]): boolean =>
  excluded.some(([f, t]) => at >= f && at <= t)

/** Absolute ranges of display-math blocks: a LONE `$$` line opens, the next lone `$$` line closes,
 *  mirroring how ``` fences pair — never the token layer's span regex, whose lazy pairing a single
 *  stray `$$` in prose or inline code would flip for the whole document below it. Relocating bytes
 *  needs line-anchored pairing; coloring a span doesn't. A delimiter line inside `excluded` (code
 *  fences, table regions) is content, not a delimiter; an unclosed opener claims nothing. Hanging
 *  delimiters (`$$ x=1` … `y $$`) and single-line `$$x$$` stay ordinary lines. `to` is the closing
 *  line's end, exclusive of the trailing newline. `excluded` is required — every caller must state
 *  which regions own their `$$` bytes, or two callers would silently disagree on the math model. */
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

/** The walk both lone-line constructs take: a line the reader answers for, outside every excluded
 *  region, carried out as its own whole-line span. */
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
  /** The `[^label]:` line's index. */
  line: number
  /** The citation's final continuation line — its own line when it has none. */
  lastLine: number
  label: string
  /** Absolute offset where the citation's text begins, past `[^label]:` and the spaces after it. */
  contentStart: number
  /** The positional number, null when nothing binds to it — an orphan, or a duplicate that lost. */
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
  /** 1 for every line of the section, the blanks between and after its citations included. */
  mask: Uint8Array
  /** Line → the citation that owns it, its continuation lines included; and line → the markers on
   *  it. Indexes over the two arrays above rather than second copies of them, because the per-line
   *  decoration pass asks about one line at a time and filtering the flat lists for every line of
   *  the document is the per-version cost the one-scan discipline exists to avoid. */
  entryAt: Map<number, CitationEntry>
  markersAt: Map<number, MarkerRef[]>
  /** The section's first citation line, or `lines.length` when there is no section. */
  firstLine: number
  /** The line a fold leaves visible — the one above the run, and -1 when nothing sits above it or
   *  there is no section. It is the rendered anchor only; a region's identity is its first citation. */
  anchorLine: number
}

// A head takes CommonMark's 0–3 space indent; four makes it indented code. The label admits neither
// `]` nor whitespace, which is what separates a citation from the `[^my note]:` link definition.
const citationHeadRe = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]*/

/** The body-marker grammar, fresh per call so no caller shares `lastIndex`. The lookbehind honors
 *  the `\[^1]` escape, which suppresses the reference at the parser too — one pattern, so the
 *  counter and the decoration pass can never disagree about what an escape means. */
export const markerRegex = (): RegExp => /(?<!\\)\[\^([^\]\s]+)\]/dg

/** The label of the `[^label]` that ends at this text's end, or null — the question "has the caret
 *  just completed a marker". Asked through `markerRegex`, so the escape and the label grammar stay
 *  the one fact the scan reads rather than a second spelling of it. */
export function markerEndingAt(text: string): string | null {
  const last = [...text.matchAll(markerRegex())].at(-1)
  return last && last.index + last[0].length === text.length ? last[1] : null
}

/** The case-fold every marker↔citation comparison runs through. Deliberately not the shared title
 *  normalization: GFM defines its own folding for footnote labels, so coupling the two would let a
 *  change to title matching silently move footnote binding. The double case swap is micromark's own,
 *  which is what makes this agree with the parser on characters like ß. */
export function foldLabel(label: string): string {
  return label.toLowerCase().toUpperCase()
}

/** The trailing run of citations reaching the document's end, with every body marker bound to it by
 *  case-folded label and numbered in first-use order. The section's boundary is derived HERE and
 *  nowhere else — six layers read it, and a boundary each of them re-derived is one they would
 *  eventually disagree about. Same exclusion contract as its siblings: a `[^1]:` line inside a
 *  fence, table or math region is content there, and `excluded` is required so two callers cannot
 *  silently disagree. A table immediately below a citation ends the run rather than continuing it —
 *  the exclusion set owns those bytes. */
export function citationScan(d: DocLines, excluded: [number, number][]): CitationScan {
  const { text, lines, lineStarts } = d
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
      // Past a blank, only an indented line still belongs to the citation above.
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

  // First-use order numbers a marker and its citation together: deriving it twice is two answers to
  // one question. A marker inside code binds nothing and takes no number — the drawn set drops those
  // from the shared code mask, so counting them here would print numbers that skip.
  const firstFor = new Map<string, CitationEntry>()
  for (const e of entries) {
    const key = foldLabel(e.label)
    if (!firstFor.has(key)) firstFor.set(key, e)
  }
  const entryAt = new Map<number, CitationEntry>()
  for (const e of entries) for (let k = e.line; k <= e.lastLine; k++) entryAt.set(k, e)

  const inCode = codeMask(text)
  const markers: MarkerRef[] = []
  const markersAt = new Map<number, MarkerRef[]>()
  let next = 1
  for (let i = 0; i < firstLine; i++) {
    const headEnd = citationHeadRe.exec(lines[i])?.[0].length
    const re = markerRegex()
    let m = re.exec(lines[i])
    for (; m !== null; m = re.exec(lines[i])) {
      const from = lineStarts[i] + m.index
      // A mid-document citation line is live prose, so its own head never draws as a marker.
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

/** The citation a label binds to, and every marker bound to it. Case-folded, which is the only
 *  comparison GFM defines between a marker and its citation — so every layer that pairs the two
 *  asks HERE rather than spelling the fold out beside its own `find`. */
export const citationFor = (c: CitationScan, label: string): CitationEntry | undefined => {
  const key = foldLabel(label)
  return c.entries.find((e) => foldLabel(e.label) === key)
}

export const markersFor = (c: CitationScan, label: string): MarkerRef[] => {
  const key = foldLabel(label)
  return c.markers.filter((m) => foldLabel(m.label) === key)
}

/** Whether this is the only marker bound to its citation — so removing it orphans the footnote.
 *  Asked HERE by both the gesture that cascades on it and the menu row that names it, which is what
 *  keeps the menu from promising something other than what the click does. */
export const isLastReference = (c: CitationScan, marker: MarkerRef): boolean =>
  markersFor(c, marker.label).every((m) => m === marker)

/** Where a line's text ends, its own newline excluded. */
export const lineEndOf = (d: { lines: string[]; lineStarts: number[] }, line: number): number =>
  d.lineStarts[line] + d.lines[line].length

export interface EmbedLine {
  /** Whole-line span, `to` exclusive of the trailing newline. */
  from: number
  to: number
  title: string
}

const loneEmbedRe = /^!\[\[([^\]\r\n]*)\]\][ \t]*$/

/** The lone-line test for one line of text — the per-line half blockEmbedLines and the tile guard
 *  both read, so a line can never be lone to one and not the other. */
export function loneEmbedTitle(line: string): string | null {
  return loneEmbedRe.exec(line)?.[1] ?? null
}

/** Lone-line page embeds: a line that IS exactly one `![[Title]]` — trailing whitespace doesn't
 *  break lone-ness, but a leading indent does: an indented line is a list continuation riding its
 *  marker (the same whitespace that would make it "lone" is what glues it to the item above), so it
 *  stays an ordinary line and its `![[…]]` renders as the inert token, exactly like a quoted one.
 *  Same exclusion contract as blockMathRanges: an embed line inside a fence, table, or math region
 *  is content there, and `excluded` is required so two callers can't silently disagree. */
export function blockEmbedLines(d: DocLines, excluded: [number, number][]): EmbedLine[] {
  return loneLines(d, excluded, (line) => {
    const title = loneEmbedTitle(line)
    return title === null ? null : { title }
  })
}

export interface WebpageLine {
  /** Whole-line span, `to` exclusive of the trailing newline. */
  from: number
  to: number
  label: string
  url: string
}

/** Lone-line webpage embeds — the `![label](url)` sibling of blockEmbedLines, same lone-line and
 *  exclusion contract: an indented line is list continuation, and one inside a fence, table, or
 *  math region is content there. */
export function blockWebpageLines(d: DocLines, excluded: [number, number][]): WebpageLine[] {
  return loneLines(d, excluded, loneWebpageEmbed)
}

// A callout HEAD tags a type: `> [!callout] …`. The tag is the discriminator vs a plain quote and is invisible
// chrome (hidden at render) — `||` is the typing shorthand. Detection is per-HEAD, not per-run: any `[!type]`
// line starts its own callout, so adjacent / hand-typed / pasted heads never merge into one box with a raw tag.
const calloutTagRe = /^\[!([a-zA-Z][\w-]*)\][ \t]?/

export function isCalloutHead(line: string): boolean {
  return calloutHeadPrefixLen(line) !== null
}

export interface CalloutLine {
  first: boolean
  last: boolean
  /** Chars to hide at line start: the head line hides `> [!type] `, body lines hide their `> ` prefix. */
  prefixEnd: number
}

/** Per-line callout membership for the whole doc. A callout starts at each `[!type]` head and extends through
 *  the following blockquote lines that aren't themselves heads (a new head, or a non-quote line, ends it).
 *  A `[!type]` lookalike inside a CLOSED fence is code, never a head — it neither starts a callout nor
 *  terminates the run it sits in. Callers holding a fence scan pass it; otherwise one is computed here. */
export function calloutLines(
  lines: string[],
  fences: (FenceInfo | undefined)[] = scanFencedCode(lines, lineOffsets(lines)),
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
      // Body lines strip only ONE `>` level (not the greedy prefix), so a deeper `> > …` keeps its inner `>`
      // for the nested-quote renderer. The head also hides its `[!type]` tag.
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

/** If `line` is a callout HEAD (`> [!type] …`), the length of its full `> [!type] ` prefix; else null.
 *  Lets backspace at the head's content-start remove the whole callout cleanly instead of eating the tag. */
export function calloutHeadPrefixLen(line: string): number | null {
  const pfx = blockquotePrefixRe.exec(line)?.[0]
  if (!pfx || !isBlockquoteLine(line)) return null
  const tag = calloutTagRe.exec(line.slice(pfx.length))
  return tag ? pfx.length + tag[0].length : null
}

/** True when the line holding `pos` is part of a callout. Used by input handlers (Shift+Enter stay-in-box). */
export function lineInCallout(doc: string, pos: number): boolean {
  const lines = doc.split('\n')
  let off = 0
  let idx = 0
  for (; idx < lines.length; idx++) {
    const end = off + lines[idx].length
    if (pos <= end) break
    off = end + 1
  }
  return calloutLines(lines)[idx] !== undefined
}

export const MAX_NESTING_LEVEL = 3

export function indentLevel(ws: string): number {
  let tabs = 0
  let spaces = 0
  for (const ch of ws) ch === '\t' ? tabs++ : spaces++
  return Math.min(MAX_NESTING_LEVEL, tabs + Math.floor(spaces / 2))
}

/** The single list-marker parser. Every layer reads markers through this — never its own regex.
 *  `kind` is `checkbox` only when a non-empty box follows a bullet (`1. [ ]` stays `ordered`).
 *  `arrow` is the `→ ` list (typed `-> `, auto-converted to the glyph by `dashArrow`); it behaves like a
 *  bullet but its marker IS the on-disk glyph, so it's kept as literal source rather than widget-swapped. */
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

// `-` and `+` are the only bullet characters: each has a render branch, so every line this admits is a
// line the reader sees as a list item. `*` and `•` stay prose — parsing them would hand the drag and
// renumber layers items nothing draws.
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

/** parseListMarker that also sees a list behind a `>`/callout prefix — offsets stay full-line-relative, so
 *  callers (drag, format) treat a callout list item exactly like a top-level one. */
export function parseListMarkerPrefixed(line: string): ListMarker | null {
  const pfx = blockquotePrefixRe.exec(line)?.[0]
  // Only strip a prefix the renderer also treats as a quote (`>x` with no space isn't one) — keeps the drag /
  // renumber layers from seeing a list the user can't see.
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
// Three or more of ONE marker, optionally spaced. A first-character test admits every `- item` in
// the document and pays a full parse for each, which is what made a bulleted page the expensive
// case on a per-keystroke scan; the parser stays the authority for whatever this admits.
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
/** Decomposes a heading line into its pieces — level is `hashes.length`, the content start is
 *  `indent+hashes+space`. The one heading-shape regex, and the editor's own answer to "is this a
 *  heading worth treating as one", which is narrower than `isHeadingLine`'s on purpose: a bare `#`
 *  is a valid empty ATX heading to the parser, and this returns null for it. That null is the gate
 *  the heading scan and the render both read, and it is what stops the `#` you have just typed —
 *  before its space — from hiding itself, taking a chevron, opening an empty outline row under an
 *  empty persisted fold key, and swallowing the paragraphs below it into a draggable section. The
 *  indent stays space-only so both agree that a tab-indented `#` is indented code rather than a
 *  heading. */
export function headingParts(
  line: string,
): { indent: string; hashes: string; space: string; content: string } | null {
  const m = headingPartsRe.exec(line)
  return m ? { indent: m[1], hashes: m[2], space: m[3], content: m[4] } : null
}

/** Needs whitespace or the line's end after the last `>`: `> a`, `>> a` and a bare `>` activate — the bare
 *  one is the blank line inside a quote, so a quote holding one stays a single block. `>a` and `>>a` do not. */
export function isBlockquoteLine(line: string): boolean {
  if (!blockquotePrefilter.test(line)) return false
  return parse(line).children.some((n) => n.type === 'blockquote')
}

/** Inline-math gate: keeps prose / currency `$…$` from tokenizing as math. */
export function isInlineMathContent(content: string): boolean {
  if (/^[+-]?(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?$/.test(content)) return false // currency
  const mathyCount = (content.match(/[\\^_{}=+\-*/<>]/g) ?? []).length
  if (mathyCount === 0) return /^[A-Za-z]{1,3}$/.test(content)
  const tokens = content.split(/\s+/).filter(Boolean).length
  if (mathyCount >= 3) return tokens <= 120
  if (mathyCount === 2) return tokens <= 40
  return tokens <= 6
}
