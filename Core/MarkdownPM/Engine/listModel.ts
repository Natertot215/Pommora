import {
  continuesList,
  indentWidth,
  isBlank,
  isSequenced,
  ordinalOf,
  ordinalText,
  parseListMarker,
  parseListMarkerPrefixed,
  type BlockSpan,
  type ListMarker,
  type MarkdownScope,
  type SequencedMarker,
} from './detect'
import {
  applyEdits,
  diffAsSingleReplace,
  lineEndOf,
  lineIndexAt,
  lineOffsetsOf,
  quoteDepthOf,
  quotePrefix,
  type TextEdit,
  lineStartAt,
  lineEndAt,
} from './markdownCode'
import { type DocScan, inSealedLine, scanDoc, spanAt } from './docScan'

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(doc: string, pos: number): TextEdit | null {
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarkerPrefixed(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm?.kind !== 'checkbox') return null
  return { from: ls + lm.box.start, to: ls + lm.box.end, insert: lm.checked ? '[ ]' : '[x]' }
}

type Reader = number | 'outside'

/** Whether line `k` is open text to a `reader` on another line, or to one outside every block: on a page a code block is read only from inside it, so a list written there switches and counts on its own and nothing outside reaches in, while math and tables are never read; a cell reads every line. */
export function readsFrom(scan: DocScan, k: number, reader: Reader, scope: MarkdownScope): boolean {
  if (scope !== 'page') return true
  const code = scan.fences[k]
  const own = reader === 'outside' ? undefined : scan.fences[reader]
  return code?.from === own?.from && (code !== undefined || !inSealedLine(scan, k))
}

export function itemAt(
  scan: DocScan,
  k: number,
  reader: Reader,
  scope: MarkdownScope,
): ListMarker | null {
  if (scope !== 'page') return parseListMarker(scan.lines[k])
  return readsFrom(scan, k, reader, scope) ? scan.markers[k] : null
}

type ListRole = 'sibling' | 'nested' | 'blank' | 'ends'

export function rolesAgainst(
  scan: DocScan,
  i: number,
  scope: MarkdownScope,
): (k: number) => ListRole {
  const depth = quoteDepthOf(scan.lines[i])
  const level = itemAt(scan, i, i, scope)!.level
  return (line) => {
    let k = line
    if (!readsFrom(scan, k, i, scope)) {
      if (scan.fences[i] !== undefined) return 'ends'
      const code = scan.fences[k] ?? spanAt(scan.maths, scan.lineStarts[k])
      if (code !== undefined) k = lineIndexAt(scan, code.from)
    }
    const own = quoteDepthOf(scan.lines[k])
    const lm = itemAt(scan, k, i, scope)
    if (own < depth) return 'ends'
    if (own === depth && lm !== null)
      return lm.level === level ? 'sibling' : lm.level > level ? 'nested' : 'ends'
    return continuesList(scan.lines[k], depth)
  }
}

/** The items a list draws at line `i`'s depth under its parent, in order, each side stopping at the first sibling `joins` rejects, and the last line the group's nesting reaches. Depth is quote depth and level, whatever whitespace indents a line, and a blank line outside a quote is a loose list's gap, while inside one it ends the quote. */
export function siblingsAt(
  scan: DocScan,
  i: number,
  scope: MarkdownScope,
  joins: (k: number) => boolean = () => true,
): { items: number[]; last: number } {
  const role = rolesAgainst(scan, i, scope)
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
export function subBlockAt(scan: DocScan, pos: number, scope: MarkdownScope): BlockSpan | null {
  const first = lineIndexAt(scan, pos)
  if (itemAt(scan, first, first, scope) === null) return null
  const role = rolesAgainst(scan, first, scope)
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
  reader: Reader,
  scope: MarkdownScope,
): { k: number; end: number }[] {
  const owners: { k: number; end: number }[] = []
  for (let j = k; j >= 0; j--) {
    const lm = itemAt(scan, j, reader, scope)
    if (lm !== null) {
      const end = subBlockAt(scan, scan.lineStarts[j], scope)!.to
      if (end >= scan.lineStarts[k]) owners.push({ k: j, end })
    }
    if (endsListsAbove(scan, j, lm, scope)) break
  }
  return owners
}

function endsListsAbove(
  scan: DocScan,
  j: number,
  lm: ListMarker | null,
  scope: MarkdownScope,
): boolean {
  const block =
    scope === 'page' ? (scan.fences[j] ?? spanAt(scan.maths, scan.lineStarts[j])) : undefined
  if (lm !== null ? lm.level > 0 : block !== undefined && lineIndexAt(scan, block.from) !== j)
    return false
  const line = scan.lines[j]
  for (let d = quoteDepthOf(line) - (lm === null ? 0 : 1); d >= 0; d--)
    if (continuesList(line, d) !== 'ends') return false
  return true
}

export interface Slot {
  at: number
  indent?: string
}

// The drop indent a block adopts is the target's lead, so dragging in or out of a callout re-prefixes correctly.
const leadOf = (line: string): string => {
  const quote = quotePrefix(line).length
  return line.slice(0, quote + indentWidth(line.slice(quote)))
}

/** Strips the head's lead by LENGTH off each line's own lead, so it can't silently skip a descendant that mixes tabs and spaces. */
function reindentBlock(blockLines: string[], targetIndent: string | undefined): string[] {
  if (targetIndent === undefined) return blockLines
  const headLen = leadOf(blockLines[0]).length
  return blockLines.map((line) => {
    const ws = leadOf(line)
    return targetIndent + ws.slice(Math.min(headLen, ws.length)) + line.slice(ws.length)
  })
}

type MoveSeams = { looseSource: boolean; looseSlot: boolean }

function rebuildMove(
  doc: string,
  range: BlockSpan,
  slot: Slot,
  { looseSource, looseSlot }: MoveSeams,
): { doc: string; sourceAt: number; destAt: number } | null {
  const trailingNL = doc.endsWith('\n')
  const lines = doc.split('\n')
  if (trailingNL) lines.pop()
  const starts = lineOffsetsOf(lines)
  const blankAt = (i: number): boolean => i >= 0 && i < lines.length && isBlank(lines[i])

  const bStart = starts.indexOf(range.from)
  if (bStart < 0) return null
  let bEnd = bStart
  while (bEnd + 1 < lines.length && starts[bEnd + 1] <= range.to) bEnd++

  let tLine = slot.at >= doc.length ? lines.length : starts.indexOf(slot.at)
  if (tLine < 0) return null
  while (looseSlot && blankAt(tLine)) tLine++
  if (tLine >= bStart && tLine <= bEnd + 1) return null

  const blockLines = reindentBlock(lines.slice(bStart, bEnd + 1), slot.indent)
  let cutStart = bStart
  let cutEnd = bEnd
  if (looseSource && blankAt(bEnd + 1)) cutEnd = bEnd + 1
  else if (looseSource && blankAt(bStart - 1)) cutStart = bStart - 1

  const out: string[] = []
  const sep = (wanted: boolean): void => {
    if (wanted && out.length && !isBlank(out[out.length - 1])) out.push('')
  }
  let destLine = 0
  let sourceLine = 0
  for (let i = 0; i < lines.length; i++) {
    if (i === tLine) {
      sep(looseSlot)
      destLine = out.length
      out.push(...blockLines)
      if (looseSlot) out.push('')
    }
    if (i < cutStart || i > cutEnd) {
      if (i === cutEnd + 1) {
        sep(looseSource)
        sourceLine = out.length
      }
      out.push(lines[i])
    }
  }
  if (tLine === lines.length) {
    sep(looseSlot)
    destLine = out.length
    out.push(...blockLines)
  }
  if (cutEnd + 1 >= lines.length) sourceLine = out.length

  const joined = out.join('\n')
  const newDoc = joined + (trailingNL ? '\n' : '')
  if (newDoc === doc) return null
  const offsets = lineOffsetsOf(out)
  return {
    doc: newDoc,
    sourceAt: offsets[sourceLine] ?? joined.length,
    destAt: offsets[destLine] ?? joined.length,
  }
}

/** Recounts every sequenced run holding a position in `at`, each once however many positions it holds, where a position on a blank line, as in a loose list's gap, counts the run below it. A line in `arrived` had its marker written by the edit, so its ordinal came from the writer rather than the run, and never sets a top-level run's start, while a run holding a line in `repicked` counts from 1 or A. */
export function renumberRuns(
  scan: DocScan,
  at: readonly number[],
  scope: MarkdownScope,
  arrived: ReadonlySet<number> = new Set(),
  repicked: ReadonlySet<number> = new Set(),
): TextEdit[] {
  const counted = new Set<number>()
  return at.flatMap((p) => {
    let i = lineIndexAt(scan, p)
    while (i + 1 < scan.lines.length && isBlank(scan.lines[i])) i++
    if (counted.has(i)) return []
    const rows = runAt(scan, i, scope)
    for (const { k } of rows) counted.add(k)
    return renumberRun(scan, rows, arrived, repicked)
  })
}

type Row = { k: number; lm: SequencedMarker }

function runAt(scan: DocScan, i: number, scope: MarkdownScope): Row[] {
  const head = itemAt(scan, i, i, scope)
  if (head === null || !isSequenced(head)) return []
  const markerOf = (k: number): ListMarker => itemAt(scan, k, i, scope)!
  const joins = (k: number): boolean => {
    const lm = markerOf(k)
    return isSequenced(lm) && lm.kind === head.kind
  }
  return siblingsAt(scan, i, scope, joins).items.map((k) => ({
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
  slot: Slot,
  scope: MarkdownScope,
): TextEdit[] | null {
  const doc = scan.text
  const gapBefore = (items: readonly number[], n: number): boolean =>
    n > 0 && n < items.length && isBlank(scan.lines[items[n] - 1])
  const first = lineIndexAt(scan, block.from)
  const own = siblingsAt(scan, first, scope).items
  const at = own.indexOf(first)
  const looseSource = gapBefore(own, at) || gapBefore(own, at + 1)
  const t = lineIndexAt(scan, slot.at)
  const lead = slot.indent ?? leadOf(scan.lines[first])
  const anchor = [t, t - 1].find(
    (k) => k >= 0 && itemAt(scan, k, k, scope) !== null && leadOf(scan.lines[k]) === lead,
  )
  const group = anchor === undefined ? [] : siblingsAt(scan, anchor, scope).items
  const n = group.findIndex((k) => k >= t)
  const looseSlot = gapBefore(group, n < 0 ? group.length - 1 : Math.max(n, 1))
  const moved = rebuildMove(doc, block, slot, { looseSource, looseSlot })
  if (moved === null) return null

  const finalDoc = applyEdits(
    moved.doc,
    renumberRuns(scanDoc(moved.doc), [moved.sourceAt, moved.destAt], scope),
  )
  return diffAsSingleReplace(doc, finalDoc)
}

export function moveRange(doc: string, range: BlockSpan, slot: Slot): TextEdit[] | null {
  const moved = rebuildMove(doc, range, slot, { looseSource: true, looseSlot: true })
  return moved === null ? null : diffAsSingleReplace(doc, moved.doc)
}
