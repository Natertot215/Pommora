import {
  isSequenced,
  nestedUnder,
  ordinalOf,
  ordinalText,
  parseListMarkerPrefixed as parseListMarker,
  type ListMarker,
} from './detect'
import {
  applyEdits,
  lineEndOf,
  lineIndexAt,
  lineOffsetsOf,
  quoteDepthOf,
  quotePrefix,
  quotePrefixWidth,
  type TextEdit,
  lineStartAt,
  lineEndAt,
} from './markdownCode'
import { type DocScan, indentWidth, inJoinedMath } from './docScan'

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(doc: string, pos: number): TextEdit | null {
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

export function subBlockAt(scan: DocScan, pos: number): SubBlock | null {
  const { lines } = scan
  const first = lineIndexAt(scan, pos)
  const head = parseListMarker(lines[first])
  if (head === null) return null
  const depth = quoteDepthOf(lines[first])

  let last = first
  for (let k = first + 1; k < lines.length; k++) {
    if (!inJoinedMath(scan, k, first, last)) {
      if (quoteDepthOf(lines[k]) !== depth) break
      const lm = parseListMarker(lines[k])
      const body = lines[k].slice(quotePrefixWidth(lines[k], depth))
      // A wrapped item's continuation body rides with its item — moving the marker line alone would strand it.
      if (lm === null ? body.trim() === '' || !/^[ \t]/.test(body) : lm.level <= head.level) break
    }
    last = k
  }
  return { from: scan.lineStarts[first], to: lineEndOf(scan, last), level: head.level }
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

type MoveSeams = 'exact' | 'fenced'

function rebuildMove(
  doc: string,
  range: BlockRange,
  slot: Slot,
  seams: MoveSeams,
): { doc: string; sourceAt: number; destAt: number } | null {
  const fenced = seams === 'fenced'
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
  while (fenced && tLine < lines.length && isBlank(tLine)) tLine++
  if (tLine >= bStart && tLine <= bEnd + 1) return null

  const blockLines = reindentBlock(lines.slice(bStart, bEnd + 1), slot.indent)
  let cutStart = bStart
  let cutEnd = bEnd
  if (fenced && isBlank(bEnd + 1)) cutEnd = bEnd + 1
  else if (fenced && isBlank(bStart - 1)) cutStart = bStart - 1

  const out: string[] = []
  const sep = (): void => {
    if (fenced && out.length && out[out.length - 1].trim() !== '') out.push('')
  }
  let destLine = 0
  let sourceLine = 0
  for (let i = 0; i < lines.length; i++) {
    if (i === tLine) {
      sep()
      destLine = out.length
      out.push(...blockLines)
      if (fenced) out.push('')
    }
    if (i < cutStart || i > cutEnd) {
      if (i === cutEnd + 1) {
        sep()
        sourceLine = out.length
      }
      out.push(lines[i])
    }
  }
  if (tLine === lines.length) {
    sep()
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

/** Recounts every sequenced run holding a position in `at`, each once however many positions it holds. A line in `arrived` had its marker written by the edit, so its ordinal came from the writer rather than the run, and never sets a top-level run's start. */
export function renumberRuns(
  doc: string,
  at: readonly number[],
  arrived: ReadonlySet<number> = new Set(),
): TextEdit[] {
  const seen = new Set<number>()
  return at
    .flatMap((p) => renumberRun(doc, p, arrived))
    .filter((c) => !seen.has(c.from) && seen.add(c.from))
}

function renumberRun(doc: string, pos: number, arrived: ReadonlySet<number>): TextEdit[] {
  if (pos < 0 || pos > doc.length) return []
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarker(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm === null || !isSequenced(lm.kind)) return []
  const kind = lm.kind
  const indent = doc.slice(ls, ls + lm.markerStart)

  // A nested run counts from 1. A top-level run counts from its SMALLEST present ordinal: a move only permutes the ordinals, so a list that began at 5 stays 5,6,7 while a 1-based one snaps back. Deeper markers, continuations and blank lines are skipped, not terminators, since items apart by a blank line are one loose list.
  const carries = (t: string): boolean => t.trim() === '' || nestedUnder(t, indent)
  let runStart = ls
  for (let p = ls; p > 0; ) {
    const prevStart = lineStartAt(doc, p - 1)
    const t = doc.slice(prevStart, p - 1)
    const plm = parseListMarker(t)
    if (
      plm !== null &&
      plm.kind === kind &&
      doc.slice(prevStart, prevStart + plm.markerStart) === indent
    )
      runStart = prevStart
    else if (!carries(t)) break
    p = prevStart
  }

  type Row = { line: number; from: number; marker: ListMarker }
  const rows: Row[] = []
  for (let p = runStart; p < doc.length; ) {
    const le = lineEndAt(doc, p)
    const t = doc.slice(p, le)
    const rlm = parseListMarker(t)
    const sameLevel =
      rlm !== null && rlm.kind === kind && doc.slice(p, p + rlm.markerStart) === indent
    if (sameLevel) rows.push({ line: p, from: p + rlm.markerStart, marker: rlm })
    else if (!carries(t)) break
    p = le + 1
  }
  const settled = rows.filter((r) => !arrived.has(r.line))
  const start =
    lm.level > 0
      ? 1
      : Math.min(...(settled.length > 0 ? settled : rows).map((r) => ordinalOf(r.marker)))
  const changes: TextEdit[] = []
  rows.forEach(({ from, marker }, i) => {
    const have = marker.ordinal ?? ''
    const want = ordinalText(kind, start + i)
    if (have !== want) changes.push({ from, to: from + have.length, insert: want })
  })
  return changes
}

/** Both renumber passes run against the POST-MOVE doc so the ordinal offsets are correct, then map back onto the original. */
export function dropChanges(doc: string, block: BlockRange, slot: Slot): TextEdit[] | null {
  const moved = rebuildMove(doc, block, slot, 'exact')
  if (moved === null) return null

  const finalDoc = applyEdits(moved.doc, renumberRuns(moved.doc, [moved.sourceAt, moved.destAt]))
  return diffAsSingleReplace(doc, finalDoc)
}

export function moveRange(doc: string, range: BlockRange, slot: Slot): TextEdit[] | null {
  const moved = rebuildMove(doc, range, slot, 'fenced')
  return moved === null ? null : diffAsSingleReplace(doc, moved.doc)
}

export function diffAsSingleReplace(a: string, b: string): TextEdit[] {
  if (a === b) return []
  let pre = 0
  const max = Math.min(a.length, b.length)
  while (pre < max && a[pre] === b[pre]) pre++
  let suf = 0
  while (suf < max - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  return [{ from: pre, to: a.length - suf, insert: b.slice(pre, b.length - suf) }]
}
