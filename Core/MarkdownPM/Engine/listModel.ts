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
import { type DocScan, inJoinedMath, inSealedLine, scanDoc } from './docScan'

/** Shared by the extension's click handler so press-to-drag never flips the box. */
export function checkboxToggleChange(doc: string, pos: number): TextEdit | null {
  const ls = lineStartAt(doc, pos)
  const lm = parseListMarkerPrefixed(doc.slice(ls, lineEndAt(doc, pos)))
  if (lm?.kind !== 'checkbox') return null
  return { from: ls + lm.box.start, to: ls + lm.box.end, insert: lm.checked ? '[ ]' : '[x]' }
}

/** Whether line `k` is open text to a reader on line `from`, or to one outside every block: on a page a code block is read only from inside it, so a list written there switches and counts on its own and nothing outside reaches in, while math and tables are never read; a cell reads every line. */
export function readsFrom(
  scan: DocScan,
  k: number,
  from: number | 'outside',
  scope: MarkdownScope,
): boolean {
  if (scope !== 'page') return true
  const code = scan.fences[k]
  const own = from === 'outside' ? undefined : scan.fences[from]
  return code?.from === own?.from && (code !== undefined || !inSealedLine(scan, k))
}

export function itemAt(
  scan: DocScan,
  k: number,
  from: number,
  scope: MarkdownScope,
): ListMarker | null {
  if (scope !== 'page') return parseListMarker(scan.lines[k])
  return readsFrom(scan, k, from, scope) ? scan.markers[k] : null
}

type ListRole = 'sibling' | 'nested' | 'blank' | 'outside'

function rolesAgainst(scan: DocScan, i: number, scope: MarkdownScope): (k: number) => ListRole {
  const depth = quoteDepthOf(scan.lines[i])
  const level = itemAt(scan, i, i, scope)!.level
  return (line) => {
    let k = line
    if (!readsFrom(scan, k, i, scope)) {
      if (scan.fences[i] !== undefined) return 'outside'
      const code = scan.fences[k]
      if (code !== undefined) k = lineIndexAt(scan, code.from)
    }
    const own = quoteDepthOf(scan.lines[k])
    const lm = itemAt(scan, k, i, scope)
    if (own < depth) return 'outside'
    if (own === depth && lm !== null)
      return lm.level === level ? 'sibling' : lm.level > level ? 'nested' : 'outside'
    const body = scan.lines[k].slice(quotePrefixWidth(scan.lines[k], depth))
    // A wrapped item's continuation body rides with its item — moving the marker line alone would strand it.
    if (!isBlank(body)) return continuesList(body) ? 'nested' : 'outside'
    return depth === 0 ? 'blank' : 'outside'
  }
}

/** The items a list draws at line `i`'s depth under its parent, in order, and the last line the group's nesting reaches. Depth is quote depth and level, whatever whitespace indents a line, and a blank line outside a quote is a loose list's gap, while inside one it ends the quote. */
export function siblingsAt(
  scan: DocScan,
  i: number,
  scope: MarkdownScope,
): { items: number[]; last: number } {
  const role = rolesAgainst(scan, i, scope)
  const above: number[] = []
  for (let k = i - 1; k >= 0; k--) {
    const r = role(k)
    if (r === 'outside') break
    if (r === 'sibling') above.push(k)
  }
  const items = [...above.reverse(), i]
  let last = i
  for (let k = i + 1; k < scan.lines.length; k++) {
    const r = role(k)
    if (r === 'outside') break
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
    if (!inJoinedMath(scan, k, first, last) && role(k) !== 'nested') break
    last = k
  }
  return { from: scan.lineStarts[first], to: lineEndOf(scan, last) }
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
  range: BlockSpan,
  slot: Slot,
  seams: MoveSeams,
): { doc: string; sourceAt: number; destAt: number } | null {
  const fenced = seams === 'fenced'
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
  while (fenced && blankAt(tLine)) tLine++
  if (tLine >= bStart && tLine <= bEnd + 1) return null

  const blockLines = reindentBlock(lines.slice(bStart, bEnd + 1), slot.indent)
  let cutStart = bStart
  let cutEnd = bEnd
  if (fenced && blankAt(bEnd + 1)) cutEnd = bEnd + 1
  else if (fenced && blankAt(bStart - 1)) cutStart = bStart - 1

  const out: string[] = []
  const sep = (): void => {
    if (fenced && out.length && !isBlank(out[out.length - 1])) out.push('')
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

/** Recounts every sequenced run holding a position in `at`, each once however many positions it holds. A line in `arrived` had its marker written by the edit, so its ordinal came from the writer rather than the run, and never sets a top-level run's start, while a run holding a line in `repicked` counts from 1 or A. */
export function renumberRuns(
  scan: DocScan,
  scope: MarkdownScope,
  at: readonly number[],
  arrived: ReadonlySet<number> = new Set(),
  repicked: ReadonlySet<number> = new Set(),
): TextEdit[] {
  const counted = new Set<number>()
  return at.flatMap((p) => {
    const i = lineIndexAt(scan, p)
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
  const rows: Row[] = []
  for (const k of siblingsAt(scan, i, scope).items) {
    const lm = itemAt(scan, k, i, scope)!
    if (isSequenced(lm) && lm.kind === head.kind) rows.push({ k, lm })
    else if (k < i) rows.length = 0
    else break
  }
  return rows
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

/** Both renumber passes run against the POST-MOVE doc so the ordinal offsets are correct, then map back onto the original. */
export function dropChanges(
  doc: string,
  block: BlockSpan,
  slot: Slot,
  scope: MarkdownScope,
): TextEdit[] | null {
  const moved = rebuildMove(doc, block, slot, 'exact')
  if (moved === null) return null

  const finalDoc = applyEdits(
    moved.doc,
    renumberRuns(scanDoc(moved.doc), scope, [moved.sourceAt, moved.destAt]),
  )
  return diffAsSingleReplace(doc, finalDoc)
}

export function moveRange(doc: string, range: BlockSpan, slot: Slot): TextEdit[] | null {
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
