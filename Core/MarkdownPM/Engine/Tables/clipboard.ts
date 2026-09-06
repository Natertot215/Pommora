import { delimCell, parseDelimiter, pipeRow, serialize, splitRow } from './codec'
import type { Column, TableModel } from './model'

// Plain text in the file's own pipe-row grammar, so a copy stays legible pasted anywhere and an
// external pipe fragment pastes structurally. Shape carries the meaning: pipe rows alone are a
// rectangle, a delimiter line makes it a column (one wide) or a whole table (wider). Cells travel in
// source form, exactly as the model holds them.

export type TablePayload =
  | { kind: 'rect'; grid: string[][] }
  | { kind: 'column'; header: string; column: Column; body: string[] }
  | { kind: 'table' }

export function encodeRect(grid: string[][]): string {
  return grid.map(pipeRow).join('\n')
}

export function encodeColumn(header: string, column: Column, body: string[]): string {
  return [header, delimCell(column), ...body].map((c) => pipeRow([c])).join('\n')
}

/** Null where the text isn't table-shaped, and for a lone pipe cell — one cell of text is a text
 *  paste, not a structural one. An all-empty payload (a copied outline) reads as inert `table`. */
export function decodePayload(text: string): TablePayload | null {
  const lines = text.replace(/\n+$/, '').split('\n')
  for (const l of lines) {
    const t = l.trim()
    if (t.length < 2 || !t.startsWith('|') || !t.endsWith('|')) return null
  }
  const grid = lines.map((l) => splitRow(l.trim(), 0).cells.map((c) => c.text))
  const delim = lines.length >= 2 ? parseDelimiter(lines[1]) : null
  if (delim) {
    if (delim.length > 1) return { kind: 'table' }
    const header = grid[0][0] ?? ''
    const body = grid.slice(2).map((r) => r[0] ?? '')
    if (header === '' && body.every((c) => c === '')) return { kind: 'table' }
    return { kind: 'column', header, column: delim[0], body }
  }
  if (lines.some((l) => parseDelimiter(l))) return { kind: 'table' }
  if (grid.length === 1 && grid[0].length === 1) return null
  return { kind: 'rect', grid }
}

/** Shape and heading row kept, every body cell blank — what Copy Outline carries. */
export function serializeOutline(m: TableModel): string {
  return serialize({ ...m, rows: m.rows.map((r) => r.map(() => '')) })
}

/** The visual-row slice a rectangle covers, headers as ordinary cells. */
export function rectGrid(
  m: TableModel,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): string[][] {
  const grid: string[][] = []
  for (let r = r0; r <= r1; r++) {
    const cells = r === 0 ? m.header : m.rows[r - 1]
    grid.push(cells.slice(c0, c1 + 1))
  }
  return grid
}
