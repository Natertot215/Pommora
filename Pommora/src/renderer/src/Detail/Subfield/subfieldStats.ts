import { markdownLinkRegex } from '@shared/links'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import { tableRegions } from '@renderer/MarkdownPM/Tables/regions'
import {
  blockMathRanges,
  blockquotePrefixRe,
  calloutHeadPrefixLen,
  citationScan,
  fenceRangesOf,
  headingParts,
  isBlockquoteLine,
  inlineCodeRegex,
  isThematicBreakLine,
  loneEmbedTitle,
  markerRegex,
  parseListMarker,
  scanFencedCode,
  splitWithOffsets,
  type CitationScan,
  type DocLines,
} from '@renderer/MarkdownPM/detect'

/** Page document stats for the Subfield. `lines` counts source lines the document actually holds;
 *  `words`/`characters` count the prose the editor actually draws (so `## **Bold**` is one word,
 *  "Bold").
 *
 *  The footnotes section is outside all three counts, through the one boundary its scan derives —
 *  the same scan the line count stops at and the prose pass blanks, so the three numbers keep
 *  describing one document. A body marker is where the two prose pipelines legitimately diverge:
 *  the character pass sees its source, the word pass has it removed, so `sentence[^1].` reads as
 *  the one word the reader sees while the file's own characters are still reported.
 *
 *  Some constructs are still counted as their source: a Markdown table, whose pipes and delimiter
 *  row the editor replaces with a widget, and indented code and math alongside it. Reading a
 *  table's regions needs a parse per candidate, and this runs on every edit — so it waits for the
 *  day the Subfield can read the editor's own cached document scan rather than paying for its own. */
export interface PageStats {
  lines: number
  words: number
  characters: number
  /** Citations in the trailing section — what decides whether the Subfield offers its control. */
  citations: number
}

/** Everything the editor draws as chrome or as a widget is replaced by a NEWLINE rather than a
 *  space. Newlines are already stripped before characters are counted and already separate words,
 *  so a mask can only ever remove source characters — a space placeholder was itself being counted,
 *  which is what made a long fence add a character per line. */
const GONE = '\n'

/** Line-level chrome, read through the editor's own detectors rather than a private regex — the
 *  list-marker parser in particular is the single source every layer reads. A line that IS an
 *  embed is a tile: it draws no prose at all. Resolution isn't checked here, so an unresolved lone
 *  embed is counted as the tile it is trying to be. */
function stripLineChrome(line: string): string {
  if (loneEmbedTitle(line) !== null) return ''
  if (loneWebpageEmbed(line)) return ''

  // The same base the editor's own line pass takes: a callout head's prefix INCLUDING its `[!type]`
  // tag, else the quote run — gated, because `>abc` with no space is prose the renderer never
  // quotes. Every construct below reads the line from that base, exactly as the renderer does.
  const base =
    calloutHeadPrefixLen(line) ??
    (isBlockquoteLine(line) ? (blockquotePrefixRe.exec(line)?.[0].length ?? 0) : 0)
  const inner = line.slice(base)

  if (isThematicBreakLine(inner)) return ''
  const heading = headingParts(inner)
  if (heading) return heading.content
  const marker = parseListMarker(inner)
  return marker ? inner.slice(marker.contentStart) : inner
}

/** Inline syntax → what the reader sees. An inline `![[Title]]` is the editor's inert embed token,
 *  whose title stays visible; an inline `![label](url)` keeps its bang, because the editor has no
 *  image renderer and draws it as prose beside an ordinary link. */
function stripInline(text: string): string {
  return text
    .replace(inlineCodeRegex(), GONE)
    .replace(/!?\[\[([^\]|\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_m, title, alias) => alias || title)
    .replace(markdownLinkRegex(), (_m, label) => label)
    .replace(/[*_~]/g, '')
}

/** The section's boundary, read against the same exclusions the editor's own scan uses — fences,
 *  then tables, then math — so the two can never disagree about where the section starts.
 *
 *  Widening the exclusion can only ever BREAK a run, never create one, so a fence-only scan finding
 *  no section is already the final answer. That is what keeps a table scan — a micromark parse per
 *  candidate, two orders of magnitude dearer than everything else here — off the keystroke path of
 *  every page that has no footnotes at all. */
function citationBoundary(d: DocLines, fences: [number, number][]): CitationScan {
  const cheap = citationScan(d, fences)
  if (cheap.firstLine >= d.lines.length) return cheap
  const base: [number, number][] = [
    ...fences,
    ...tableRegions(d).map((r): [number, number] => [r.from, r.to]),
  ]
  return citationScan(d, [...base, ...blockMathRanges(d, base)])
}

/** One answer per body string. The footer mounts two items on a page — the counts and the footnotes
 *  control — and both need the same figures on the same keystroke; deriving them twice would answer
 *  the citations boundary twice on a per-keystroke path. One entry is the whole cache the footer
 *  needs, since both items read the same string within one render. */
let memoBody: string | null = null
let memoStats: PageStats | null = null
export function pageStats(body: string): PageStats {
  if (body !== memoBody || memoStats === null) {
    memoBody = body
    memoStats = computeStats(body)
  }
  return memoStats
}

export function computeStats(body: string): PageStats {
  if (!body) return { lines: 0, words: 0, characters: 0, citations: 0 }
  // A single trailing newline is the terminator, not a phantom empty line.
  const trimmed = body.endsWith('\n') ? body.slice(0, -1) : body
  const d = splitWithOffsets(trimmed)
  const { lines } = d

  const fences = scanFencedCode(lines, d.lineStarts)
  const cited = citationBoundary(d, fenceRangesOf(fences))
  const prose = stripInline(
    lines.map((line, i) => (fences[i] || cited.mask[i] ? GONE : stripLineChrome(line))).join('\n'),
  )

  // Strictly-visible characters: the structural newlines and every mask go, the rest stays.
  const characters = prose.replace(/\n/g, '').length
  // The one line the character count never sees — and an empty string rather than GONE, so a marker
  // glued to its word (`sentence[^1].`) stays one word instead of splitting into two.
  const words = (prose.replace(markerRegex(), '').match(/\S+/g) ?? []).length
  return {
    lines: cited.firstLine,
    words,
    characters,
    citations: cited.entries.length,
  }
}
