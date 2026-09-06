// `to` is EXCLUSIVE of the trailing newline, matching SubBlock.to / headingSections.to / TableRegion.to, which the drag's self-drop guard relies on.
import { fenceRangesOf, parseListMarkerPrefixed, type CalloutLine } from './detect'
import type { DocScan } from './docScan'
import { headingSections } from './headingScan'

type BlockKind =
  | 'heading'
  | 'list'
  | 'callout'
  | 'blockquote'
  | 'code'
  | 'table'
  | 'math'
  | 'embed'
  | 'webpage'
  | 'hr'
  | 'paragraph'

export interface Block {
  from: number
  to: number
  kind: BlockKind
}

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

function blockContext(scan: DocScan): BlockContext {
  const { lines, lineStarts: starts, fences: fenceAt, maths, embeds, webpages, tables } = scan
  const n = lines.length
  const ends = lines.map((l, i) => starts[i] + l.length)

  const fences = fenceRangesOf(fenceAt)
  const inFence = (i: number): boolean =>
    i >= 0 && i < n && fences.some(([f, t]) => starts[i] >= f && starts[i] <= t)
  const spanned =
    (spans: readonly { from: number; to: number }[]) =>
    (i: number): boolean =>
      i >= 0 && i < n && spans.some((s) => starts[i] >= s.from && starts[i] <= s.to)
  const inTable = spanned(tables)
  const inMath = (i: number): boolean =>
    i >= 0 && i < n && maths.some(([f, t]) => starts[i] >= f && starts[i] <= t)
  const inEmbed = spanned(embeds)
  const inWebpage = spanned(webpages)

  // Only where a run actually holds a marker, so a bare indented paragraph isn't swept in. A math range whose opener joined the run rides it whole; one whose opener sits outside never gets pulled in.
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

  const callout = scan.callouts.map((c, i) => (scan.literal[i] ? undefined : c))
  const heading = scan.headings
  const hr = scan.breaks
  const bq = scan.quotes.map((q, i) => q && !scan.literal[i])
  // The citations section owns no block — reusing the unowned-line state costs two lines, where a BlockKind of its own would span five sites the compiler wouldn't all check.
  const cited = (i: number): boolean => scan.citations.mask[i] === 1
  const claimed = (i: number): boolean =>
    i < 0 ||
    i >= n ||
    lines[i].trim() === '' ||
    cited(i) ||
    !!callout[i] ||
    bq[i] ||
    inFence(i) ||
    inTable(i) ||
    inMath(i) ||
    inEmbed(i) ||
    inWebpage(i) ||
    heading[i] ||
    listMember[i] ||
    hr[i]

  // Box-first precedence: code/table/math beat heading/list so a `#` inside one isn't mis-read, and hr beats paragraph so it's never absorbed. A blank line inside a math or fence range still resolves via the range.
  const kindAt = (i: number): BlockKind | null => {
    if (i < 0 || i >= n) return null
    if (lines[i].trim() === '' || cited(i)) return null
    if (callout[i]) return 'callout'
    if (bq[i]) return 'blockquote'
    if (inFence(i)) return 'code'
    if (inTable(i)) return 'table'
    if (inMath(i)) return 'math'
    if (inEmbed(i)) return 'embed'
    if (inWebpage(i)) return 'webpage'
    if (heading[i]) return 'heading'
    if (listMember[i]) return 'list'
    if (hr[i]) return 'hr'
    return 'paragraph'
  }

  return { lines, n, starts, ends, callout, listMember, fences, tables, maths, claimed, kindAt }
}

// One per scan, so a hover, drag, or menu never re-walks the document the scan already walked.
const contexts = new WeakMap<DocScan, BlockContext>()
function blockContextOf(scan: DocScan): BlockContext {
  let ctx = contexts.get(scan)
  if (!ctx) {
    ctx = blockContext(scan)
    contexts.set(scan, ctx)
  }
  return ctx
}

export function blockAt(scan: DocScan, pos: number): Block | null {
  const ctx = blockContextOf(scan)
  const { n, starts, ends, callout, listMember } = ctx

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
    case 'code': {
      const f = ctx.fences.find(([ff, tt]) => starts[li] >= ff && starts[li] <= tt)!
      return { from: f[0], to: f[1], kind: 'code' }
    }
    case 'table': {
      const r = ctx.tables.find((rr) => starts[li] >= rr.from && starts[li] <= rr.to)!
      return { from: r.from, to: r.to, kind: 'table' }
    }
    case 'math': {
      const r = ctx.maths.find(([f, t]) => starts[li] >= f && starts[li] <= t)!
      return { from: r[0], to: r[1], kind: 'math' }
    }
    case 'heading': {
      const sec = headingSections(scan).find((s) => s.from === starts[li])
      // The section's `to` reaches the blank before the next heading — the fold wants that span, a block doesn't: the mover re-fences with one blank, so a trailing blank here compounds on every reorder.
      return sec
        ? {
            from: sec.from,
            to: sec.from + scan.text.slice(sec.from, sec.to).trimEnd().length,
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
    case 'embed':
    case 'webpage':
      return { from: starts[li], to: ends[li], kind }
    case 'paragraph': {
      let a = li
      while (a > 0 && !ctx.claimed(a - 1)) a--
      let b = li
      while (b < n - 1 && !ctx.claimed(b + 1)) b++
      return { from: starts[a], to: ends[b], kind: 'paragraph' }
    }
  }
}

interface BlockStart {
  from: number
  kind: BlockKind
}

/** Single pass over the shared block context; a per-line `blockAt` call would be O(n²). */
export function blockStarts(scan: DocScan): BlockStart[] {
  const ctx = blockContextOf(scan)
  const { n, starts, callout, listMember } = ctx
  const out: BlockStart[] = []
  for (let i = 0; i < n; i++) {
    const kind = ctx.kindAt(i)
    if (kind === null) continue
    // Range-backed kinds test by range identity, never the previous line's kind: a neighbor test would double-start a block whose interior holds a blank line, and swallow the second of two glued blocks.
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
        first = true
    }
    if (first) out.push({ from: starts[i], kind })
  }
  return out
}
