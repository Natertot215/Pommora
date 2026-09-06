// Pure source-line logic for list drag-to-reorder — the doc string and offsets only, so it is unit-testable without an editor.
import { parseListMarkerPrefixed as parseListMarker } from './detect'
import { lineOffsetsOf, quoteDepthOf } from '@pommora/core/Connections/markdownCode'
import { scanOf } from './docScan'
import { lineStartAt, lineEndAt } from '../Input/edits'

export interface ChangeSpec {
  from: number
  to: number
  insert: string
}

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(doc: string, pos: number): ChangeSpec | null {
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarker(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm?.kind !== 'checkbox' || !lm.box) return null
  return { from: ls + lm.box.start, to: ls + lm.box.end, insert: lm.checked ? '[ ]' : '[x]' }
}

/** `to` is the last line's end, EXCLUSIVE of the trailing newline. The move logic reads only these two offsets, so it is block-type-blind. */
interface BlockRange {
  from: number
  to: number
}

export interface SubBlock extends BlockRange {
  level: number
}

export function subBlockAt(doc: string, pos: number): SubBlock | null {
  const from = lineStartAt(doc, pos)
  const headEnd = lineEndAt(doc, from)
  const head = parseListMarker(doc.slice(from, headEnd))
  if (head === null) return null
  const headDepth = quoteDepthOf(doc.slice(from, headEnd))

  const maths = scanOf(doc).maths
  let to = headEnd
  for (let p = headEnd; p < doc.length; ) {
    const fs = p + 1
    const fe = lineEndAt(doc, fs)
    const fline = doc.slice(fs, fe)
    // A line inside a math range whose opener rides this sub-block is formula content, mirroring blockModel's absorb rule.
    const inJoinedMath = (): boolean => {
      const r = maths.find(([f, t]) => fs >= f && fs <= t)
      return r !== undefined && r[0] >= from && r[0] <= to
    }
    if (quoteDepthOf(fline) !== headDepth && !inJoinedMath()) break
    const lm = parseListMarker(fline)
    if (lm === null) {
      // A wrapped item's continuation body rides with its item — moving the marker line alone would strand it.
      if ((fline.trim() === '' || !/^[ \t]/.test(fline)) && !inJoinedMath()) break
    } else if (lm.level <= head.level && !inJoinedMath()) break
    to = fe
    p = fe
  }
  return { from, to, level: head.level }
}

export interface Slot {
  at: number
  indent?: string
}

// The drop indent a block adopts is the target's lead, so dragging in or out of a callout re-prefixes
// correctly. Leading `[ \t]*` first so an indented `  > - x` strips its `>` too.
const LEAD_RE = /^[ \t]*(?:>[ \t]?)*[ \t]*/

/** Strips the head's lead by LENGTH off each line's own lead, so it can't silently skip a descendant that mixes tabs and spaces. */
function reindentBlock(blockText: string, targetIndent: string | undefined): string {
  if (targetIndent === undefined) return blockText
  const headLen = (blockText.match(LEAD_RE)?.[0] ?? '').length
  return blockText
    .split('\n')
    .map((line) => {
      const ws = line.match(LEAD_RE)?.[0] ?? ''
      return targetIndent + ws.slice(Math.min(headLen, ws.length)) + line.slice(ws.length)
    })
    .join('\n')
}

function moveBlockChanges(doc: string, block: BlockRange, slot: Slot): ChangeSpec[] | null {
  const blockText = reindentBlock(doc.slice(block.from, block.to), slot.indent)
  // Cut one adjoining newline so no blank line is orphaned: the trailing one, or the preceding one at EOF.
  const atEof = block.to >= doc.length
  const cutFrom = atEof && block.from > 0 ? block.from - 1 : block.from
  const cutTo = atEof ? doc.length : block.to + 1

  if (slot.at >= cutFrom && slot.at <= cutTo) return null

  const cut: ChangeSpec = { from: cutFrom, to: cutTo, insert: '' }

  if (slot.at >= doc.length) {
    return [
      cut,
      { from: doc.length, to: doc.length, insert: (doc.endsWith('\n') ? '' : '\n') + blockText },
    ]
  }
  return [cut, { from: slot.at, to: slot.at, insert: `${blockText}\n` }]
}

/** A "run" is a maximal block of consecutive same-indent ordered lines; only the lines whose printed number changes are returned. */
export function renumberOrderedRun(doc: string, pos: number): ChangeSpec[] {
  if (pos < 0 || pos > doc.length) return []
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarker(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm === null || lm.kind !== 'ordered') return []
  const indent = doc.slice(ls, ls + lm.markerStart)

  let runStart = ls
  while (runStart > 0) {
    const prevEnd = runStart - 1
    const prevStart = lineStartAt(doc, prevEnd)
    const plm = parseListMarker(doc.slice(prevStart, prevEnd))
    if (
      plm === null ||
      plm.kind !== 'ordered' ||
      doc.slice(prevStart, prevStart + plm.markerStart) !== indent
    )
      break
    runStart = prevStart
  }

  // Renumbered from the run's SMALLEST present digit: a move only permutes the digits, so a list that began
  // at 5 stays 5,6,7 while a 1-based one snaps back. Deeper markers and continuations are skipped, not terminators.
  const isNested = (t: string): boolean =>
    t.trim() !== '' && t.startsWith(indent) && /^[ \t]/.test(t.slice(indent.length))

  type Row = { digitFrom: number; digits: string }
  const rows: Row[] = []
  for (let p = runStart; p < doc.length; ) {
    const le = lineEndAt(doc, p)
    const t = doc.slice(p, le)
    const rlm = parseListMarker(t)
    const sameLevel =
      rlm !== null && rlm.kind === 'ordered' && doc.slice(p, p + rlm.markerStart) === indent
    if (sameLevel) rows.push({ digitFrom: p + rlm.markerStart, digits: rlm.digits ?? '0' })
    else if (!isNested(t)) break
    p = le + 1
  }
  const start = Math.min(...rows.map((r) => parseInt(r.digits, 10)))
  const changes: ChangeSpec[] = []
  rows.forEach((r, i) => {
    const want = String(start + i)
    if (r.digits !== want)
      changes.push({ from: r.digitFrom, to: r.digitFrom + r.digits.length, insert: want })
  })
  return changes
}

/** Both renumber passes run against the POST-MOVE doc so the digit offsets are correct, then map back onto the original. */
export function dropChanges(doc: string, block: BlockRange, slot: Slot): ChangeSpec[] | null {
  const move = moveBlockChanges(doc, block, slot)
  if (move === null) return null

  const moved = applyChanges(doc, move)

  // The insert's `from`, mapped through the prior cut, is the block's new start — the destination anchor.
  const [cut, ins] = move
  const cutLen = cut.to - cut.from
  const destAnchor = ins.from > cut.from ? ins.from - cutLen : ins.from
  const sourceAnchor = Math.min(block.from, moved.length)

  const renumber = [
    ...renumberOrderedRun(moved, sourceAnchor),
    ...renumberOrderedRun(moved, destAnchor),
  ]
  const finalDoc = applyChanges(moved, dedupeChanges(renumber))
  return diffAsSingleReplace(doc, finalDoc)
}

// Source and dest passes can touch the same run, so duplicate digit edits at one offset are dropped.
function dedupeChanges(changes: ChangeSpec[]): ChangeSpec[] {
  const seen = new Set<number>()
  const out: ChangeSpec[] = []
  for (const c of changes) {
    if (seen.has(c.from)) continue
    seen.add(c.from)
    out.push(c)
  }
  return out
}

export function applyChanges(doc: string, changes: ChangeSpec[]): string {
  const sorted = [...changes].sort((a, b) => a.from - b.from)
  let out = ''
  let cursor = 0
  for (const c of sorted) {
    out += doc.slice(cursor, c.from) + c.insert
    cursor = c.to
  }
  return out + doc.slice(cursor)
}

/** `b` as one replacement over `a`, trimmed to the span that differs — the idiom every rebuild-then-diff act ends on. */
export function diffAsSingleReplace(a: string, b: string): ChangeSpec[] {
  if (a === b) return []
  let pre = 0
  const max = Math.min(a.length, b.length)
  while (pre < max && a[pre] === b[pre]) pre++
  let suf = 0
  while (suf < max - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  return [{ from: pre, to: a.length - suf, insert: b.slice(pre, b.length - suf) }]
}

/** A block owns the blank line after it: the cut takes one adjoining blank so old neighbors collapse to one. */
export function blockMoveChanges(
  doc: string,
  range: BlockRange,
  slot: { at: number },
): ChangeSpec[] | null {
  const trailingNL = doc.endsWith('\n')
  const lines = doc.split('\n')
  if (trailingNL) lines.pop()
  const starts = lineOffsetsOf(lines)
  const isBlank = (i: number): boolean => i >= 0 && i < lines.length && lines[i].trim() === ''

  const bStart = starts.indexOf(range.from)
  if (bStart < 0) return null
  let bEnd = bStart
  while (bEnd + 1 < lines.length && starts[bEnd + 1] <= range.to) bEnd++

  let tLine = slot.at >= doc.length ? lines.length : starts.indexOf(slot.at)
  if (tLine < 0) return null
  // A blank line isn't a real boundary — snap forward to the next content line.
  while (tLine < lines.length && isBlank(tLine)) tLine++
  if (tLine >= bStart && tLine <= bEnd + 1) return null

  const blockLines = lines.slice(bStart, bEnd + 1)
  let cutStart = bStart
  let cutEnd = bEnd
  if (isBlank(bEnd + 1)) cutEnd = bEnd + 1
  else if (isBlank(bStart - 1)) cutStart = bStart - 1

  // A block is delimited by a blank line, so both new seams — the insert and the hole the cut leaves — are
  // guarded against fusing two non-blank lines into one list or paragraph.
  const out: string[] = []
  const sep = (): void => {
    if (out.length && out[out.length - 1].trim() !== '') out.push('')
  }
  for (let i = 0; i < lines.length; i++) {
    if (i === tLine) {
      sep()
      out.push(...blockLines, '')
    }
    if (i < cutStart || i > cutEnd) {
      if (i === cutEnd + 1) sep()
      out.push(lines[i])
    }
  }
  if (tLine === lines.length) {
    sep()
    out.push(...blockLines)
  }

  const newDoc = out.join('\n') + (trailingNL ? '\n' : '')
  return newDoc === doc ? null : diffAsSingleReplace(doc, newDoc)
}
