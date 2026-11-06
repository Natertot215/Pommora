import { indentWidth, isBlank, type BlockSpan } from './detect'
import { diffAsSingleReplace, lineOffsetsOf, quotePrefix, type TextEdit } from './markdownCode'

export interface Slot {
  at: number
  indent?: string
}

// The drop indent a block adopts is the target's lead, so dragging in or out of a callout re-prefixes correctly.
const quoteAndIndent = (line: string): string => {
  const quote = quotePrefix(line).length
  return line.slice(0, quote + indentWidth(line.slice(quote)))
}

/** Strips the head's lead by LENGTH off each line's own lead, so it can't silently skip a descendant that mixes tabs and spaces. */
function reindentBlock(blockLines: string[], targetIndent: string | undefined): string[] {
  if (targetIndent === undefined) return blockLines
  const headLen = quoteAndIndent(blockLines[0]).length
  return blockLines.map((line) => {
    const ws = quoteAndIndent(line)
    return targetIndent + ws.slice(Math.min(headLen, ws.length)) + line.slice(ws.length)
  })
}

/** A block stands apart, `fenced`, so a blank line seats it at the slot and heals the hole it leaves. An item drops straight into the lines at its slot, and only an item that was its whole list takes a blank with it. */
export function rebuildMove(
  doc: string,
  range: BlockSpan,
  slot: Slot,
  fenced: boolean,
): { doc: string; sourceAt: number; destAt: number } | null {
  const trailingNL = doc.endsWith('\n')
  const lines = doc.split('\n')
  if (trailingNL) lines.pop()
  const starts = lineOffsetsOf(lines)
  const blankAt = (i: number): boolean => i >= 0 && i < lines.length && isBlank(lines[i])
  const edgeAt = (i: number): boolean => i < 0 || i >= lines.length || blankAt(i)

  const bStart = starts.indexOf(range.from)
  let bEnd = bStart
  while (bEnd + 1 < lines.length && starts[bEnd + 1] <= range.to) bEnd++

  let tLine = slot.at >= doc.length ? lines.length : starts.indexOf(slot.at)
  while (fenced && blankAt(tLine)) tLine++
  if (tLine >= bStart && tLine <= bEnd + 1) return null

  const blockLines = reindentBlock(lines.slice(bStart, bEnd + 1), slot.indent)
  const heals = fenced || (edgeAt(bStart - 1) && edgeAt(bEnd + 1))
  let cutStart = bStart
  let cutEnd = bEnd
  if (heals && blankAt(bEnd + 1)) cutEnd = bEnd + 1
  else if (heals && blankAt(bStart - 1)) cutStart = bStart - 1

  const out: string[] = []
  const sep = (wanted: boolean): void => {
    if (wanted && out.length && !isBlank(out[out.length - 1])) out.push('')
  }
  let destLine = 0
  let sourceLine = 0
  for (let i = 0; i < lines.length; i++) {
    if (i === tLine) {
      sep(fenced)
      destLine = out.length
      out.push(...blockLines)
      if (fenced) out.push('')
    }
    if (i < cutStart || i > cutEnd) {
      if (i === cutEnd + 1) {
        sep(heals && i !== tLine)
        sourceLine = out.length
      }
      out.push(lines[i])
    }
  }
  if (tLine === lines.length) {
    sep(fenced)
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

export function moveRange(doc: string, range: BlockSpan, slot: Slot): TextEdit[] | null {
  const moved = rebuildMove(doc, range, slot, true)
  return moved === null ? null : diffAsSingleReplace(doc, moved.doc)
}
