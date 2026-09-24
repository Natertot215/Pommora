import { parseListMarker } from '../detect'
import type { Align, Column, TableModel } from './model'

export interface CellSpan {
  text: string
}
interface RowSplit {
  cells: CellSpan[]
  segments: [number, number][]
}

// GFM table-cell escaping: a pipe (and a backslash that would escape one) is backslash-escaped so it round-trips without reading as a column boundary. A backslash carrying anything else is ordinary markdown passing through — doubling it would rewrite `a \* b` into `a \\* b`.
// on commit (sync.ts), unescape at the cell-display boundary; model + segments stay in raw source form.
export const escapeCell = (s: string): string => s.replace(/\\(?=[\\|])|\|/g, (m) => `\\${m}`)
export const unescapeCell = (s: string): string => s.replace(/\\([\\|])/g, '$1')

// GFM trims a cell on both edges, so an empty last item arrives back as a bare marker with the grammar's required space gone.
// A box says task list and nothing else, so it is restored wherever it sits; a bare `-` is restored only under a list line, since a lone dash in a cell is the prose it reads as.
const BARE_MARKER = /^[ \t]*(?:(?:\d+|[A-Z])\.|[-+→])$/
const BARE_TASK = /^[ \t]*[-+][ \t]*\[[ xX]\]$/
const restoreTrailingItem = (display: string): string => {
  const cut = display.lastIndexOf('\n')
  const last = display.slice(cut + 1)
  if (BARE_TASK.test(last)) return `${display} `
  if (cut === -1 || !BARE_MARKER.test(last)) return display
  const above = display.slice(display.lastIndexOf('\n', cut - 1) + 1, cut)
  return parseListMarker(above) ? `${display} ` : display
}

// A cell is single-line GFM on disk, so an in-cell line break serializes as `<br>` (literal newlines would split the row); model + segments stay in raw source form.
export const cellToSource = (display: string): string =>
  escapeCell(display).replace(/\r?\n/g, '<br>')
export const cellToDisplay = (source: string): string =>
  restoreTrailingItem(unescapeCell(source).replace(/<br\s*\/?>/gi, '\n'))

export function splitRow(line: string, base: number): RowSplit {
  const cuts: number[] = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '|') continue
    // A pipe is structural unless preceded by an ODD run of backslashes (one-char look-behind missed `\\|`, where the backslash is itself escaped and the pipe is a real boundary — micromark's rule).
    let bs = 0
    for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++
    if (bs % 2 === 0) cuts.push(i)
  }
  const segs: [number, number][] = []
  const hasLead = line.trimStart()[0] === '|'
  // A trailing pipe is structural only if unescaped (in `cuts`) — `a | b\|` ends the last CELL, not the row.
  const hasTrail = line.trimEnd().slice(-1) === '|' && cuts.includes(line.trimEnd().length - 1)
  const starts = hasLead ? cuts : [-1, ...cuts]
  const ends = hasTrail
    ? cuts.slice(hasLead ? 1 : 0)
    : [...(hasLead ? cuts.slice(1) : cuts), line.length]
  for (let k = 0; k < ends.length; k++) segs.push([starts[k] + 1, ends[k]])
  const cells: CellSpan[] = segs.map(([s, e]) => ({ text: line.slice(s, e).trim() }))
  const segments = segs.map(([s, e]) => [base + s, base + e] as [number, number])
  return { cells, segments }
}

const DELIM_CELL = /^\s*(:?)(-+)(:?)\s*$/
export function parseDelimiter(line: string): Column[] | null {
  const inner = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
  const cols: Column[] = []
  for (const part of inner.split('|')) {
    const m = DELIM_CELL.exec(part)
    if (!m) return null
    const align: Align = m[1] && m[3] ? 'center' : m[3] ? 'right' : m[1] ? 'left' : null
    cols.push({ align, dashes: m[2].length })
  }
  return cols
}

export function delimCell(c: Column): string {
  const bar = '-'.repeat(Math.max(1, c.dashes))
  return c.align === 'center'
    ? `:${bar}:`
    : c.align === 'right'
      ? `${bar}:`
      : c.align === 'left'
        ? `:${bar}`
        : bar
}

export const pipeRow = (cells: string[]): string => `| ${cells.join(' | ')} |`

export function serialize(m: TableModel): string {
  // Cells arrive in source form — a model is only ever built from lines — so the `<br>` rule stays where the display boundary owns it, in cellToSource.
  return [pipeRow(m.header), pipeRow(m.columns.map(delimCell)), ...m.rows.map(pipeRow)].join('\n')
}
