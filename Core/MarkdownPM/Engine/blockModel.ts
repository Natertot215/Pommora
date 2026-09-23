// `to` is EXCLUSIVE of the trailing newline, matching SubBlock.to / headingSections.to / TableRegion.to, which the drag's self-drop guard relies on.
import { parseListMarkerPrefixed, type CalloutLine } from './detect'
import { type DocScan, spanAt } from './docScan'
import { lineIndexAt } from './markdownCode'
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
  n: number
  starts: number[]
  callout: (CalloutLine | undefined)[]
  listMember: boolean[]
  kindAt: (i: number) => BlockKind | null
}

function blockContext(scan: DocScan): BlockContext {
  const {
    lines,
    lineStarts: starts,
    fences,
    maths,
    callouts: callout,
    quotes: bq,
    headings,
    breaks,
  } = scan
  const n = lines.length
  const markerOf = lines.map(parseListMarkerPrefixed)

  // Only where a run actually holds a marker, so a bare indented paragraph isn't swept in. A math range whose opener joined the run rides it whole; one whose opener sits outside never gets pulled in.
  const isMarker = (i: number): boolean => markerOf[i] !== null
  const isListCont = (i: number): boolean => lines[i].trim() !== '' && /^[ \t]/.test(lines[i])
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
      const math = spanAt(maths, starts[j + 1])
      const opener = math && lineIndexAt(scan, math[0])
      if (opener !== undefined && opener >= i && opener <= j) {
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

  const ranged = new Array<BlockKind | undefined>(n)
  const hold = (kind: BlockKind, spans: readonly { from: number; to: number }[]): void => {
    for (const { from, to } of spans)
      for (let k = lineIndexAt(scan, from); k < n && starts[k] <= to; k++) ranged[k] ??= kind
  }
  hold('table', scan.tables)
  hold(
    'math',
    maths.map(([from, to]) => ({ from, to })),
  )
  hold('embed', scan.embeds)
  hold('webpage', scan.webpages)
  // Box-first precedence: code/table/math beat heading/list so a `#` inside one isn't mis-read, and hr beats paragraph so it's never absorbed. The citations section owns no block, where a BlockKind of its own would span five sites the compiler wouldn't all check.
  const kindAt = (i: number): BlockKind | null => {
    if (i < 0 || i >= n) return null
    if (lines[i].trim() === '' || i >= scan.citations.firstLine) return null
    if (callout[i]) return 'callout'
    if (bq[i]) return 'blockquote'
    if (fences[i]) return 'code'
    if (ranged[i]) return ranged[i]
    if (headings[i]) return 'heading'
    if (listMember[i]) return 'list'
    if (breaks[i]) return 'hr'
    return 'paragraph'
  }

  return { n, starts, callout, listMember, kindAt }
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
  const { n, starts, callout, listMember } = ctx
  const ends = (i: number): number => starts[i] + scan.lines[i].length

  const li = lineIndexAt(scan, pos)
  const kind = ctx.kindAt(li)
  if (kind === null) return null

  switch (kind) {
    case 'callout': {
      let a = li
      while (a > 0 && callout[a] && !callout[a]!.first) a--
      let b = li
      while (b < n - 1 && callout[b] && !callout[b]!.last) b++
      return { from: starts[a], to: ends(b), kind: 'callout' }
    }
    case 'blockquote': {
      let a = li
      while (a > 0 && ctx.kindAt(a - 1) === 'blockquote') a--
      let b = li
      while (b < n - 1 && ctx.kindAt(b + 1) === 'blockquote') b++
      return { from: starts[a], to: ends(b), kind: 'blockquote' }
    }
    case 'code': {
      const f = scan.fences[li]!
      return { from: f.from, to: f.to, kind: 'code' }
    }
    case 'table': {
      const r = spanAt(scan.tables, starts[li])!
      return { from: r.from, to: r.to, kind: 'table' }
    }
    case 'math': {
      const r = spanAt(scan.maths, starts[li])!
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
        : { from: starts[li], to: ends(li), kind: 'heading' }
    }
    case 'list': {
      let a = li
      while (a > 0 && listMember[a - 1]) a--
      let b = li
      while (b < n - 1 && listMember[b + 1]) b++
      return { from: starts[a], to: ends(b), kind: 'list' }
    }
    case 'hr':
    case 'embed':
    case 'webpage':
      return { from: starts[li], to: ends(li), kind }
    case 'paragraph': {
      let a = li
      while (a > 0 && ctx.kindAt(a - 1) === 'paragraph') a--
      let b = li
      while (b < n - 1 && ctx.kindAt(b + 1) === 'paragraph') b++
      return { from: starts[a], to: ends(b), kind: 'paragraph' }
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
        first = i === 0 || ctx.kindAt(i - 1) !== 'blockquote'
        break
      case 'code':
        first = scan.fences[i]?.role === 'open'
        break
      case 'table':
        first = spanAt(scan.tables, starts[i])?.from === starts[i]
        break
      case 'math':
        first = spanAt(scan.maths, starts[i])?.[0] === starts[i]
        break
      case 'list':
        first = !listMember[i - 1]
        break
      case 'paragraph':
        first = ctx.kindAt(i - 1) !== 'paragraph'
        break
      default:
        first = true
    }
    if (first) out.push({ from: starts[i], kind })
  }
  return out
}
