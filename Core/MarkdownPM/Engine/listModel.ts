import {
  continuesList,
  fenceBodyStart,
  isBlank,
  isSequenced,
  ordinalOf,
  ordinalText,
  parseListMarkerPrefixed,
  type BlockSpan,
  type ListMarker,
  type SequencedMarker,
} from './detect'
import {
  applyEdits,
  diffAsSingleReplace,
  lineEndOf,
  lineIndexAt,
  quoteDepthOf,
  type TextEdit,
  lineStartAt,
  lineEndAt,
} from './markdownCode'
import { rebuildMove, type Slot } from './blockMove'
import { type DocScan, markerIn, scanDoc, spanAt } from './docScan'

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(doc: string, pos: number): TextEdit | null {
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarkerPrefixed(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm?.kind !== 'checkbox') return null
  return { from: ls + lm.box.start, to: ls + lm.box.end, insert: lm.checked ? '[ ]' : '[x]' }
}

export function openerOf(scan: DocScan, k: number): number {
  const block = scan.fences[k] ?? spanAt(scan.maths, scan.lineStarts[k])
  return block === undefined ? k : lineIndexAt(scan, block.from)
}

type ListRole = 'sibling' | 'nested' | 'blank' | 'ends'

export function rolesAgainst(scan: DocScan, i: number): (k: number) => ListRole {
  const depth = quoteDepthOf(scan.lines[i])
  const level = scan.markers[i]!.level
  const block = scan.fences[i]
  return (line) => {
    if (block !== undefined && scan.fences[line]?.role !== 'content') return 'ends'
    const k = block === undefined ? openerOf(scan, line) : line
    const own = quoteDepthOf(scan.lines[k])
    const lm = scan.markers[k]
    if (own < depth) return 'ends'
    if (own === depth && lm !== null)
      return lm.level === level ? 'sibling' : lm.level > level ? 'nested' : 'ends'
    return block === undefined
      ? continuesList(scan.lines[k], depth)
      : continuesList(scan.lines[k].slice(fenceBodyStart(scan.lines[k], block)), 0)
  }
}

/** The items a list draws at line `i`'s depth under its parent, in order, each side stopping at the first sibling `joins` rejects, and the last line the group's nesting reaches. Depth is quote depth and level, whatever whitespace indents a line, and a blank line outside a quote is a loose list's gap, while inside one it ends the quote. */
export function siblingsAt(
  scan: DocScan,
  i: number,
  joins: (k: number) => boolean = () => true,
): { items: number[]; last: number } {
  const role = rolesAgainst(scan, i)
  const above: number[] = []
  for (let k = i - 1; k >= 0; k--) {
    const r = role(k)
    if (r === 'ends' || (r === 'sibling' && !joins(k))) break
    if (r === 'sibling') above.push(k)
  }
  const items = [...above.reverse(), i]
  let last = i
  for (let k = i + 1; k < scan.lines.length; k++) {
    const r = role(k)
    if (r === 'ends' || (r === 'sibling' && !joins(k))) break
    if (r === 'sibling') items.push(k)
    if (r !== 'blank') last = k
  }
  return { items, last }
}

/** `to` is the last line's end, EXCLUSIVE of the trailing newline. The move logic reads only these two offsets, so it is block-type-blind. */
export function subBlockAt(scan: DocScan, pos: number): BlockSpan | null {
  const first = lineIndexAt(scan, pos)
  if (scan.markers[first] === null) return null
  const role = rolesAgainst(scan, first)
  let last = first
  for (let k = first + 1; k < scan.lines.length; k++) {
    const r = role(k)
    if (r === 'nested') last = k
    else if (r !== 'blank') break
  }
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
    const end = subBlockAt(scan, scan.lineStarts[j])!.to
    if (end >= scan.lineStarts[k]) owners.push({ k: j, end })
    if (lm.level === 0 && quoteDepthOf(scan.lines[j]) === 0) break
  }
  return owners
}

/** Recounts every sequenced run holding a position in `at`, each once however many positions it holds, where a position on a blank line, as in a loose list's gap, counts the run below it. A line in `arrived` had its marker written by the edit, so its ordinal came from the writer rather than the run, and never sets a top-level run's start, while a run holding a line in `repicked` counts from 1 or A. */
export function renumberRuns(
  scan: DocScan,
  at: readonly number[],
  arrived: ReadonlySet<number> = new Set(),
  repicked: ReadonlySet<number> = new Set(),
): TextEdit[] {
  const counted = new Set<number>()
  return at.flatMap((p) => {
    let i = lineIndexAt(scan, p)
    while (i + 1 < scan.lines.length && isBlank(scan.lines[i])) i++
    if (counted.has(i)) return []
    const rows = runAt(scan, i)
    for (const { k } of rows) counted.add(k)
    return renumberRun(scan, rows, arrived, repicked)
  })
}

type Row = { k: number; lm: SequencedMarker }

function runAt(scan: DocScan, i: number): Row[] {
  const head = scan.markers[i]
  if (head === null || !isSequenced(head)) return []
  const markerOf = (k: number): ListMarker => scan.markers[k]!
  const joins = (k: number): boolean => {
    const lm = markerOf(k)
    return isSequenced(lm) && lm.kind === head.kind
  }
  return siblingsAt(scan, i, joins).items.map((k) => ({
    k,
    lm: markerOf(k) as SequencedMarker,
  }))
}

function renumberRun(
  scan: DocScan,
  rows: readonly Row[],
  arrived: ReadonlySet<number>,
  repicked: ReadonlySet<number>,
): TextEdit[] {
  if (rows.length === 0) return []
  const head = rows[0].lm
  // A nested run counts from 1. A top-level run counts from its SMALLEST present ordinal: a move only permutes the ordinals, so a list that began at 5 stays 5,6,7 while a 1-based one snaps back.
  const settled = rows.filter(({ k }) => !arrived.has(scan.lineStarts[k]))
  const start =
    head.level > 0 || rows.some(({ k }) => repicked.has(scan.lineStarts[k]))
      ? 1
      : Math.min(...(settled.length > 0 ? settled : rows).map(({ lm }) => ordinalOf(lm)))
  const changes: TextEdit[] = []
  rows.forEach(({ k, lm: { markerStart, ordinal } }, n) => {
    const from = scan.lineStarts[k] + markerStart
    const want = ordinalText(head.kind, start + n)
    if (ordinal !== want) changes.push({ from, to: from + ordinal.length, insert: want })
  })
  return changes
}

/** A separator moves with the item only where the source or the slot sits between blank-separated siblings, and both renumber passes run against the POST-MOVE doc so the ordinal offsets are correct, then diff back onto the original as one replace. */
export function dropChanges(
  scan: DocScan,
  block: BlockSpan,
  slot: Slot & { line: number },
): TextEdit[] | null {
  const doc = scan.text
  const gapBefore = (items: readonly number[], n: number): boolean =>
    n > 0 && n < items.length && isBlank(scan.lines[items[n] - 1])
  const first = lineIndexAt(scan, block.from)
  const own = siblingsAt(scan, first).items
  const at = own.indexOf(first)
  const looseSource = gapBefore(own, at) || gapBefore(own, at + 1)
  const t = lineIndexAt(scan, slot.at)
  const group = siblingsAt(scan, slot.line).items
  const n = group.findIndex((k) => k >= t)
  const looseSlot = gapBefore(group, n < 0 ? group.length - 1 : Math.max(n, 1))
  const moved = rebuildMove(doc, block, slot, { looseSource, looseSlot })
  if (moved === null) return null

  const finalDoc = applyEdits(
    moved.doc,
    renumberRuns(scanDoc(moved.doc, scan.scope), [moved.sourceAt, moved.destAt]),
  )
  return diffAsSingleReplace(doc, finalDoc)
}
