import {
  fenceBodyStart,
  isSequenced,
  ordinalOf,
  ordinalText,
  type BlockSpan,
  type SequencedMarker,
} from './detect'
import {
  lineEndOf,
  lineIndexAt,
  quoteDepthOf,
  quotePrefixWidth,
  type TextEdit,
} from './markdownCode'
import { type DocScan, fenceDelimiter, markerIn, sealedBlock } from './docScan'

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(scan: DocScan, pos: number): TextEdit | null {
  const k = lineIndexAt(scan, pos)
  const lm = scan.markers[k]
  if (lm?.kind !== 'checkbox') return null
  const ls = scan.lineStarts[k]
  return { from: ls + lm.boxStart, to: ls + lm.markerEnd, insert: lm.checked ? '[ ]' : '[x]' }
}

function openerOf(scan: DocScan, k: number): number {
  const block = sealedBlock(scan, k)
  return block === undefined ? k : lineIndexAt(scan, block.from)
}

/** Whether a line at quote depth `depth` or deeper that isn't an item there continues a list at that depth: a wrapped item's body, indented past the list's prefix, does, and a blank line ends the list. */
const continuesList = (line: string, depth: number): boolean =>
  /^[ \t]+\S/.test(line.slice(quotePrefixWidth(line, depth)))

/** Whether line `k`, read from outside any block it sits in, rides the item above it in a list at quote depth `depth`. */
export const ridesList = (scan: DocScan, k: number, depth: number): boolean =>
  continuesList(scan.lines[openerOf(scan, k)], depth)

type ListRole = 'sibling' | 'nested' | 'ends'

function rolesAgainst(
  scan: DocScan,
  i: number,
  level = scan.markers[i]!.level,
): (k: number) => ListRole {
  const depth = quoteDepthOf(scan.lines[i])
  const block = scan.fences[i]
  return (line) => {
    if (block !== undefined && scan.fences[line]?.role !== 'content') return 'ends'
    const k = block === undefined ? openerOf(scan, line) : line
    const own = quoteDepthOf(scan.lines[k])
    const lm = scan.markers[k]
    if (own < depth) return 'ends'
    if (own === depth && lm !== null)
      return lm.level === level ? 'sibling' : lm.level > level ? 'nested' : 'ends'
    const rides =
      block === undefined
        ? ridesList(scan, line, depth)
        : continuesList(scan.lines[k].slice(fenceBodyStart(scan.lines[k], block)), 0)
    return rides ? 'nested' : 'ends'
  }
}

/** The items a list draws at line `i`'s depth under its parent, in order, and the last line the group's nesting reaches. Depth is quote depth and level, whatever whitespace indents a line. */
export function siblingsAt(scan: DocScan, i: number): { items: number[]; last: number } {
  const role = rolesAgainst(scan, i)
  const above: number[] = []
  for (let k = i - 1; k >= 0; k--) {
    const r = role(k)
    if (r === 'ends') break
    if (r === 'sibling') above.push(k)
  }
  const items = [...above.reverse(), i]
  let last = i
  for (let k = i + 1; k < scan.lines.length; k++) {
    const r = role(k)
    if (r === 'ends') break
    if (r === 'sibling') items.push(k)
    last = k
  }
  return { items, last }
}

/** `to` is the last line's end, EXCLUSIVE of the trailing newline. The move logic reads only these two offsets, so it is block-type-blind. */
export function subBlockAt(scan: DocScan, pos: number): BlockSpan {
  const first = lineIndexAt(scan, pos)
  const role = rolesAgainst(scan, first)
  let last = first
  while (last + 1 < scan.lines.length && role(last + 1) === 'nested') last++
  return { from: scan.lineStarts[first], to: lineEndOf(scan, last) }
}

export function ownersOf(
  scan: DocScan,
  k: number,
  region: number | undefined,
): { k: number; end: number }[] {
  const owners: { k: number; end: number }[] = []
  for (let j = k; j >= 0; j--) {
    const lm = markerIn(scan, j, region)
    if (lm === null) continue
    const end = subBlockAt(scan, scan.lineStarts[j]).to
    if (end >= scan.lineStarts[k]) owners.push({ k: j, end })
    if (lm.level === 0 && quoteDepthOf(scan.lines[j]) === 0) break
  }
  return owners
}

type Row = { k: number; lm: SequencedMarker }

/** The runs of the list line `i` belongs to, read from `i`, each line of that list marked in `seen`. A shallower item closes the runs beneath it, and an item of another kind closes its own level's. */
function runsAround(scan: DocScan, i: number, seen = new Set<number>()): Row[][] {
  const role = rolesAgainst(scan, i, 0)
  const runs: Row[][] = []
  if (role(i) === 'ends') return runs
  const depth = quoteDepthOf(scan.lines[i])
  let first = i
  while (first > 0 && role(first - 1) !== 'ends') first--
  const region = scan.fences[i]?.from
  const open: (Row[] | undefined)[] = []
  for (let k = first; k < scan.lines.length && role(k) !== 'ends'; k++) {
    if (quoteDepthOf(scan.lines[k]) !== depth) continue
    seen.add(k)
    const lm = markerIn(scan, k, region)
    if (lm === null) continue
    open.length = lm.level + 1
    const run = open[lm.level]
    if (!isSequenced(lm)) open[lm.level] = undefined
    else if (run?.[0].lm.kind === lm.kind) run.push({ k, lm })
    else {
      open[lm.level] = [{ k, lm }]
      runs.push(open[lm.level]!)
    }
  }
  return runs
}

type Hold = { k: number; lm: SequencedMarker | null }

/** Recounts every run of each list holding a position in `at`: a nested run from 1, and any other from its first item, or, for a run a hold names, from the marker the hold carries, or not at all where it carries none. A position on a fence's delimiter reads from outside its block. */
export function renumberRuns(
  scan: DocScan,
  at: readonly number[],
  held: readonly Hold[] = [],
): TextEdit[] {
  const seen = new Set<number>()
  return at.flatMap((p) => {
    let i = lineIndexAt(scan, p)
    while (fenceDelimiter(scan, i) && openerOf(scan, i) > 0) i = openerOf(scan, i) - 1
    if (seen.has(i)) return []
    return runsAround(scan, i, seen).flatMap((rows) => {
      const hold = held.find((h) => rows.some(({ k }) => k === h.k))
      return hold?.lm === null ? [] : renumberRun(scan, rows, hold?.lm)
    })
  })
}

function renumberRun(scan: DocScan, rows: readonly Row[], held?: SequencedMarker): TextEdit[] {
  const head = rows[0].lm
  const start = head.level > 0 ? 1 : ordinalOf(held?.kind === head.kind ? held : head)
  const changes: TextEdit[] = []
  rows.forEach(({ k, lm: { markerStart, ordinal } }, n) => {
    const from = scan.lineStarts[k] + markerStart
    const want = ordinalText(head.kind, start + n)
    if (ordinal !== want) changes.push({ from, to: from + ordinal.length, insert: want })
  })
  return changes
}

const runHolding = (scan: DocScan, k: number): Row[] | undefined =>
  runsAround(scan, k).find((rows) => rows.some((row) => row.k === k))

/** A move permutes the runs it lands in, so none can be read for its start afterward: each run a move's insertion lands in counts from the start of the run that held, before the move, its first line the move didn't bring, mapped back by `back`. A run a move brought whole stays as written, and a run a move leaves counts from the item now first, as a deletion does. */
export function moveHolds(
  was: DocScan,
  scan: DocScan,
  landings: readonly { from: number; to: number }[],
  back: (pos: number) => number,
): Hold[] {
  const brought = (k: number): boolean =>
    landings.some(({ from, to }) => scan.lineStarts[k] >= from && scan.lineStarts[k] < to)
  return landings.flatMap(({ from, to }): Hold[] => {
    const line = lineIndexAt(scan, from)
    const k = scan.lineStarts[line] < from && scan.lineStarts[line + 1] < to ? line + 1 : line
    const rows = runHolding(scan, k)
    if (!rows) return []
    const kept = rows.find((row) => !brought(row.k))
    if (!kept) return [{ k: rows[0].k, lm: null }]
    const source = runHolding(was, lineIndexAt(was, back(scan.lineStarts[kept.k])))
    return source ? [{ k: rows[0].k, lm: source[0].lm }] : []
  })
}
