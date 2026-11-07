import { describe, it, expect } from 'vitest'
import { splitWithOffsets } from '../detect'
import { tableRegions as regionsIn, modelFromRegion } from './regions'
import { pageCodeMask, parseTable, stream } from '../../../Testing/markdownEngine'
import { parse } from '../parser'

const tableRegions = (doc: string): ReturnType<typeof regionsIn> =>
  regionsIn(splitWithOffsets(doc), pageCodeMask(doc))

describe('regions', () => {
  it('finds a top-level table and its row/pipe geometry; excludes the delimiter from rows', () => {
    const doc = 'intro\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nafter'
    const [r] = tableRegions(doc)
    expect(r.rows.length).toBe(2)
    expect(r.columns.length).toBe(2)
    expect(doc.slice(r.from, r.to)).toBe('| a | b |\n|---|---|\n| 1 | 2 |')
  })

  it('skips a pipe table inside a fenced code block', () => {
    const doc = '```\n| a | b |\n|---|---|\n```'
    expect(tableRegions(doc)).toEqual([])
  })

  it('skips a half-typed table (no delimiter yet)', () => {
    expect(tableRegions('| a | b |\nnot a delimiter')).toEqual([])
  })

  it('a quoted or blank header is no table', () => {
    for (const doc of ['> | a |\n|---|', ' \n|---|']) expect(tableRegions(doc)).toEqual([])
  })

  it('a pipe inside inline code still splits a cell under GFM, so an over-split header is no table', () => {
    expect(tableRegions('| `a|b` | c |\n|---|---|')).toEqual([])
  })

  it('modelFromRegion equals parseTable on the same slice (the widget skips the second parse)', () => {
    for (const table of [
      '| a | b |\n|---|---|\n| 1 | 2 |',
      '| h1 | h2 | h3 |\n| :--- | :-: | ---: |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |',
      '| a\\|b | c |\n| ---- | -- |\n| x | y |',
      '| only header |\n| --- |',
    ]) {
      const [r] = tableRegions(table)
      expect(modelFromRegion(r)).toEqual(parseTable(table))
    }
  })

  it('a table body runs exactly as far as the whole-table parse reads it', () => {
    const LINES = [
      '| 1 | 2 |',
      '2024 | 12',
      '1.x',
      '-x',
      '*x* | y',
      '| x |',
      'plain row',
      '',
      ' \t',
      '\u00a0',
      '# h',
      '> q',
      '```',
      '~~~',
      '- a',
      '-',
      '* b',
      '*',
      '+ c',
      '1. d',
      '1.',
      '2) e',
      '---',
      '***',
      '___',
      '<div>',
      '<span>x</span>',
      '<!--',
      '[^a]: note',
      '[a]: /url',
      '    code',
      ' \tcode',
      '\tcode',
      '  - nested',
      '=== ',
      '$$',
      '| a |\n|---|',
    ]
    const rowsRead = (src: string): number => {
      const { children } = parse(src)
      return children.length === 1 && children[0].type === 'table'
        ? children[0].children.length
        : -1
    }
    for (let seed = 1; seed <= 2000; seed++) {
      const r = stream(seed)
      const lines = ['| a | b |', '|---|---|']
      for (let n = Math.floor(r() * 8); n > 0; n--)
        lines.push(LINES[Math.floor(r() * LINES.length)])
      const doc = lines.join('\n')
      const regions = tableRegions(doc)
      const misread = regions.some((region) => {
        const own = doc.slice(region.from, region.to)
        const next = doc.slice(region.to + 1).split('\n')[0]
        return (
          rowsRead(own) !== region.rows.length ||
          (region.to < doc.length && rowsRead(`${own}\n${next}`) > region.rows.length)
        )
      })
      if (regions[0]?.from !== 0 || misread) expect.fail(`seed ${seed}\n${JSON.stringify(doc)}`)
    }
  })
})
