// The unified block resolver for block-drag: what top-level block owns a line, its extent, its kind. Pure
// source-string logic (no CM6 / DOM) so it's unit-testable, and the drag layer reads boundaries through it alone.
//
// `to` is EXCLUSIVE of the trailing newline — matching SubBlock.to / headingSections.to / TableRegion.to,
// which the drag's self-drop guard relies on. Do not return an inclusive `to`.
import {
  calloutLines,
  isBlockquoteLine,
  isHeadingLine,
  isThematicBreakLine,
  lineOffsets,
  parseListMarkerPrefixed,
  type CalloutLine,
} from '../detect'
import { fencedCodeRanges, scanFencedCode } from '../detect'
import { docLineScan } from './embedRanges'
import { tableRegions } from '../Tables/regions'
import { headingSections } from './folding'

export type BlockKind =
  | 'heading'
  | 'list'
  | 'callout'
  | 'blockquote'
  | 'code'
  | 'table'
  | 'math'
  | 'embed'
  | 'hr'
  | 'paragraph'

export interface Block {
  from: number
  to: number // line end of the block's last line, exclusive of the trailing newline
  kind: BlockKind
}

// Per-line classification shared by blockAt + blockStarts: the line table and every "what owns this line"
// predicate, built once. `kindAt(i)` returns the membership kind of line i (paragraph here means "claimed by
// nothing else") or null on a blank line; `claimed` is the paragraph-boundary test.
interface BlockContext {
  lines: string[]
  n: number
  starts: number[]
  ends: number[]
  callout: (CalloutLine | undefined)[]
  listMember: boolean[]
  fences: [number, number][]
  tables: { from: number; to: number }[]
  maths: [number, number][]
  claimed: (i: number) => boolean
  kindAt: (i: number) => BlockKind | null
}

function blockContext(doc: string): BlockContext {
  const lines = doc.split('\n')
  const n = lines.length
  const starts = lineOffsets(lines)
  const ends = starts.map((s, i) => s + lines[i].length)

  const rawCallout = calloutLines(lines)
  const fences = fencedCodeRanges(doc)
  const tables = tableRegions(doc)
  const { maths, embeds } = docLineScan(doc)
  const inFence = (i: number): boolean =>
    i >= 0 && i < n && fences.some(([f, t]) => starts[i] >= f && starts[i] <= t)
  const inTable = (i: number): boolean =>
    i >= 0 && i < n && tables.some((r) => starts[i] >= r.from && starts[i] <= r.to)
  const inMath = (i: number): boolean =>
    i >= 0 && i < n && maths.some(([f, t]) => starts[i] >= f && starts[i] <= t)
  const inEmbed = (i: number): boolean =>
    i >= 0 && i < n && embeds.some((e) => starts[i] >= e.from && starts[i] <= e.to)

  // List membership: marker lines PLUS their indented continuations (a wrapped item body), but only where a
  // run actually holds a marker — so a bare indented paragraph isn't swept in. A blank line breaks a run, so
  // blank-separated "loose" items split into separate list blocks (a V1 decision); a multi-line item stays whole.
  // A math range whose opener joined the run (an indented `$$` — continuation-shaped) rides the run WHOLE:
  // its internal blank lines can't break the item, so a bullet's formula always moves with the bullet.
  // A range whose opener sits outside the run (top-level math glued below a list) never gets pulled in.
  const isMarker = (i: number): boolean => parseListMarkerPrefixed(lines[i]) !== null
  const isListCont = (i: number): boolean => lines[i].trim() !== '' && /^[ \t]/.test(lines[i])
  const mathOpenLine = maths.map(([f]) => starts.indexOf(f))
  const mathIdxAt = (k: number): number =>
    maths.findIndex(([f, t]) => starts[k] >= f && starts[k] <= t)
  const listMember = new Array<boolean>(n).fill(false)
  for (let i = 0; i < n; ) {
    if (!isMarker(i) && !isListCont(i)) {
      i++
      continue
    }
    let j = i
    while (j + 1 < n) {
      if (isMarker(j + 1) || isListCont(j + 1)) {
        j++
        continue
      }
      const m = mathIdxAt(j + 1)
      if (m >= 0 && mathOpenLine[m] >= i && mathOpenLine[m] <= j) {
        j++
        continue
      }
      break
    }
    let hasMarker = false
    for (let k = i; k <= j && !hasMarker; k++) hasMarker = isMarker(k)
    if (hasMarker) for (let k = i; k <= j; k++) listMember[k] = true
    i = j + 1
  }

  // A closed top-level fence owns its bytes outright, so a `>` inside one is code text rather than a
  // quote — the same rule the decoration pass draws by, kept in agreement here so a grip can never
  // offer to drag two lines out of a code block. A QUOTED fence keeps its box: the `>` is real there.
  const fenceAt = scanFencedCode(lines, starts)
  const literalCode = (i: number): boolean => {
    const f = fenceAt[i]
    return f?.closed === true && f.depth === 0
  }

  const callout = rawCallout.map((c, i) => (literalCode(i) ? undefined : c))

  const heading = lines.map(isHeadingLine)
  const hr = lines.map(isThematicBreakLine)
  const bq = lines.map((l, i) => !literalCode(i) && isBlockquoteLine(l))
  const claimed = (i: number): boolean =>
    i < 0 ||
    i >= n ||
    lines[i].trim() === '' ||
    !!callout[i] ||
    bq[i] ||
    inFence(i) ||
    inTable(i) ||
    inMath(i) ||
    inEmbed(i) ||
    heading[i] ||
    listMember[i] ||
    hr[i]

  // Box-first precedence: a callout/quote line resolves to its box (so quoted math stays box content);
  // code/table/math beat heading/list so a `#`/`-` inside a fence, table, or math span isn't mis-read; hr
  // beats paragraph so it's never absorbed. paragraph is the catch-all. A blank line resolves null even
  // inside a math/fence range — the RANGE claims it (see `claimed`), so a `$$…$$` holding a blank line
  // still resolves as one block from any of its content lines instead of splitting into two paragraphs.
  const kindAt = (i: number): BlockKind | null => {
    if (i < 0 || i >= n) return null // a neighbour-lookup off either doc edge owns no block
    if (lines[i].trim() === '') return null
    if (callout[i]) return 'callout'
    if (bq[i]) return 'blockquote'
    if (inFence(i)) return 'code'
    if (inTable(i)) return 'table'
    if (inMath(i)) return 'math'
    if (inEmbed(i)) return 'embed'
    if (heading[i]) return 'heading'
    if (listMember[i]) return 'list'
    if (hr[i]) return 'hr'
    return 'paragraph'
  }

  return { lines, n, starts, ends, callout, listMember, fences, tables, maths, claimed, kindAt }
}

/** The top-level block owning the line at `pos`, or null on a blank/unowned line (nothing to grab). */
export function blockAt(doc: string, pos: number): Block | null {
  const ctx = blockContext(doc)
  const { n, starts, ends, callout, listMember } = ctx

  // The line holding pos: the first whose end (pre-newline) is at/after pos.
  let li = n - 1
  for (let i = 0; i < n; i++) {
    if (pos <= ends[i]) {
      li = i
      break
    }
  }
  const kind = ctx.kindAt(li)
  if (kind === null) return null

  switch (kind) {
    case 'callout': {
      let a = li
      while (a > 0 && callout[a] && !callout[a]!.first) a--
      let b = li
      while (b < n - 1 && callout[b] && !callout[b]!.last) b++
      return { from: starts[a], to: ends[b], kind: 'callout' }
    }
    case 'blockquote': {
      let a = li
      while (a > 0 && !callout[a - 1] && ctx.kindAt(a - 1) === 'blockquote') a--
      let b = li
      while (b < n - 1 && !callout[b + 1] && ctx.kindAt(b + 1) === 'blockquote') b++
      return { from: starts[a], to: ends[b], kind: 'blockquote' }
    }
    case 'code':
      return fenceBlockAt(doc, starts[li])
    case 'table':
      return tableBlockAt(doc, starts[li])
    case 'math': {
      const r = ctx.maths.find(([f, t]) => starts[li] >= f && starts[li] <= t)!
      return { from: r[0], to: r[1], kind: 'math' }
    }
    case 'heading': {
      const sec = headingSections(doc).find((s) => s.from === starts[li])
      // The section's `to` reaches the blank line before the next heading — the fold wants that
      // span, a block doesn't: the drag's mover re-fences with one blank, so a range carrying the
      // trailing blank would compound an extra blank on every reorder (the outline's mover
      // applies the same trim).
      return sec
        ? {
            from: sec.from,
            to: sec.from + doc.slice(sec.from, sec.to).trimEnd().length,
            kind: 'heading',
          }
        : { from: starts[li], to: ends[li], kind: 'heading' }
    }
    case 'list': {
      let a = li
      while (a > 0 && listMember[a - 1]) a--
      let b = li
      while (b < n - 1 && listMember[b + 1]) b++
      return { from: starts[a], to: ends[b], kind: 'list' }
    }
    case 'hr':
      return { from: starts[li], to: ends[li], kind: 'hr' }
    case 'embed':
      return { from: starts[li], to: ends[li], kind: 'embed' }
    case 'paragraph': {
      let a = li
      while (a > 0 && !ctx.claimed(a - 1)) a--
      let b = li
      while (b < n - 1 && !ctx.claimed(b + 1)) b++
      return { from: starts[a], to: ends[b], kind: 'paragraph' }
    }
  }
}

function fenceBlockAt(doc: string, lineStart: number): Block {
  const f = fencedCodeRanges(doc).find(([ff, tt]) => lineStart >= ff && lineStart <= tt)!
  return { from: f[0], to: f[1], kind: 'code' }
}

function tableBlockAt(doc: string, lineStart: number): Block {
  const r = tableRegions(doc).find((rr) => lineStart >= rr.from && lineStart <= rr.to)!
  return { from: r.from, to: r.to, kind: 'table' }
}

export interface BlockStart {
  from: number
  kind: BlockKind
}

/** Every draggable block's first-line offset + kind, in document order — a heading line and each block inside
 *  its section both qualify; continuation/blank lines don't. The shared basis for where handles render and
 *  where a drag can drop. Single pass over the shared block context — a per-line `blockAt` call would be O(n²). */
export function blockStarts(doc: string): BlockStart[] {
  const ctx = blockContext(doc)
  const { n, starts, callout, listMember } = ctx
  const out: BlockStart[] = []
  for (let i = 0; i < n; i++) {
    const kind = ctx.kindAt(i)
    if (kind === null) continue
    // Only the FIRST line of a multi-line block starts a draggable block (a continuation line repeats its
    // kind). Range-backed kinds test by RANGE IDENTITY, never by the previous line's kind — a neighbour
    // test both double-starts a block whose interior holds a blank line (kindAt is null there, so the next
    // line reads as a fresh start — a drop candidate INSIDE a code fence) and swallows the second of two
    // glued blocks (the previous line is the first block's closer, same kind).
    let first: boolean
    switch (kind) {
      case 'callout':
        first = !!callout[i]!.first
        break
      case 'blockquote':
        first = i === 0 || ctx.kindAt(i - 1) !== 'blockquote' || !!callout[i - 1]
        break
      case 'code':
        first = ctx.fences.some(([f]) => f === starts[i])
        break
      case 'table':
        first = ctx.tables.some((r) => r.from === starts[i])
        break
      case 'math':
        first = ctx.maths.some(([f]) => f === starts[i])
        break
      case 'list':
        first = !listMember[i - 1]
        break
      case 'paragraph':
        first = ctx.claimed(i - 1)
        break
      default:
        first = true // heading, hr, and embed are always single-line block starts
    }
    if (first) out.push({ from: starts[i], kind })
  }
  return out
}
