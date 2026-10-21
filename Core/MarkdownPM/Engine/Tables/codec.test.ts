import { describe, it, expect } from 'vitest'
import {
  serialize,
  splitRow,
  parseDelimiter,
  escapeCell,
  unescapeCell,
  cellToSource,
  cellToDisplay,
} from './codec'
import { parseTable } from '../../../Testing/markdownEngine'

describe('codec', () => {
  it('splitRow splits on unescaped pipes, keeps \\| in-cell', () => {
    const r = splitRow('| a\\|b | c |', 0)
    expect(r.cells).toEqual(['a\\|b', 'c'])
  })

  it('splitRow handles rows with no outer pipes', () => {
    const r = splitRow('a | b', 0)
    expect(r.cells).toEqual(['a', 'b'])
  })

  it('splitRow: a pipe after an escaped backslash (\\\\|) is structural, not escaped', () => {
    // '| a \\| b |' — the \\ is an escaped backslash, so the following | IS a real cell boundary → 2 cells
    expect(splitRow('| a \\\\| b |', 0).cells.length).toBe(2)
  })

  it('splitRow returns full inter-pipe segments (untrimmed) — one flex item per cell', () => {
    expect(splitRow('| a | b |', 0).segments).toEqual([
      [1, 4],
      [5, 8],
    ])
  })

  it('parseDelimiter reads dashes + alignment', () => {
    expect(parseDelimiter('|:--|--:|:-:|')).toEqual([
      { align: 'left', dashes: 2 },
      { align: 'right', dashes: 2 },
      { align: 'center', dashes: 1 },
    ])
  })

  it('escapeCell / unescapeCell are inverse for backslashes and pipes', () => {
    for (const s of ['a|b', 'a\\b', 'a\\|b', 'plain', '|||', '\\\\', 'C:\\path'])
      expect(unescapeCell(escapeCell(s))).toBe(s)
    expect(escapeCell('a|b')).toBe('a\\|b')
    expect(escapeCell('a\\|b')).toBe('a\\\\\\|b')
  })

  // A backslash escaping anything but a pipe is ordinary markdown passing through, and doubling it rewrites the file for every other reader.
  it('a hand-authored cell survives a round trip through the editor', () => {
    for (const source of ['a \\* b', 'C:\\path', 'a \\_x_ b', 'a \\| b', 'plain'])
      expect(escapeCell(unescapeCell(source))).toBe(source)
  })

  it('cellToSource / cellToDisplay round-trip in-cell newlines as <br> (and still escape pipes)', () => {
    expect(cellToSource('a\nb')).toBe('a<br>b')
    expect(cellToSource('a|b\nc')).toBe('a\\|b<br>c')
    expect(cellToDisplay('a<br>b')).toBe('a\nb')
    for (const s of ['a\nb', 'a|b', 'line1\nline2|x', 'plain', 'a\nb\nc', '- a\n\t- b'])
      expect(cellToDisplay(cellToSource(s))).toBe(s)
  })

  it('round-trips canonical GFM with widths + alignment', () => {
    const src = '| a | b |\n| :--- | ---: |\n| 1 | 2 |'
    const m = parseTable(src)!
    expect(m.columns).toEqual([
      { align: 'left', dashes: 3 },
      { align: 'right', dashes: 3 },
    ])
    expect(m.header).toEqual(['a', 'b'])
    expect(m.rows).toEqual([['1', '2']])
    expect(serialize(m)).toBe(src)
  })
})

describe('what a GFM cell can hold', () => {
  it('round-trips the empty item Enter makes, which a cell trim would return as prose', () => {
    const trip = (display: string): string => cellToDisplay(cellToSource(display).trim())
    expect(trip('- a\n- ')).toBe('- a\n- ')
    expect(trip('- a\n- [ ] ')).toBe('- a\n- [ ] ')
    expect(trip('1. a\n2. ')).toBe('1. a\n2. ')
  })

  it('restores an empty task box wherever it sits, since that shape belongs to nothing else', () => {
    const trip = (display: string): string => cellToDisplay(cellToSource(display).trim())
    expect(trip('- [ ] ')).toBe('- [ ] ')
    expect(trip('- [x] ')).toBe('- [x] ')
    expect(cellToDisplay('- [ ]')).toBe('- [ ] ')
  })

  it('leaves a bare marker alone where no list stands above it', () => {
    expect(cellToDisplay('-')).toBe('-')
    expect(cellToDisplay('n/a<br>-')).toBe('n/a\n-')
  })
})
