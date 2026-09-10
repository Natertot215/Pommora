import { describe, expect, it } from 'vitest'
import { ICON_NAMES } from '@pommora/uix/Symbols/iconNames'
import { blockMenuSections, filterBlockMenu } from './blockMenu'

const seated = blockMenuSections(true)

describe('the block menu catalog', () => {
  it('titles four sections and lists their rows in order', () => {
    expect(seated.map((s) => s.title)).toEqual(['Headings', 'Lists', 'Insert', 'Embed'])
    expect(seated[0].rows.map((r) => r.label)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
    ])
    expect(seated[1].rows.map((r) => r.label)).toEqual([
      'Bullet List',
      'Numbered List',
      'Task List',
    ])
    expect(seated[2].rows.map((r) => r.label)).toEqual([
      'Blockquote',
      'Callout',
      'Code Block',
      'Table',
      'Horizontal Rule',
      'Footnote',
    ])
    expect(seated[3].rows.map((r) => r.label)).toEqual(['Internal Page', 'Webpage'])
  })

  it('offers Footnote only where a marker can bind', () => {
    expect(seated.flatMap((s) => s.rows)).toHaveLength(16)
    const unseated = blockMenuSections(false)
    expect(unseated.flatMap((s) => s.rows)).toHaveLength(15)
    expect(unseated.flatMap((s) => s.rows).map((r) => r.label)).not.toContain('Footnote')
  })

  it('names an icon the registry resolves on every row', () => {
    for (const row of seated.flatMap((s) => s.rows)) {
      expect(ICON_NAMES.has(row.icon ?? '')).toBe(true)
    }
  })
})

describe('the block menu filter', () => {
  it('keeps a section whose rows match and drops the rest', () => {
    const hea = filterBlockMenu(seated, 'hea')
    expect(hea.map((s) => s.title)).toEqual(['Headings'])
    expect(hea[0].rows).toHaveLength(5)
    expect(hea[0].rows.every((r) => r.at === 0)).toBe(true)
    expect(filterBlockMenu(seated, 'HEA')).toEqual(hea)
  })

  it('matches a word anywhere in the label and reports where it begins', () => {
    const bl = filterBlockMenu(seated, 'bl')
    expect(bl.map((s) => s.title)).toEqual(['Insert'])
    expect(bl[0].rows.map((r) => [r.label, r.at])).toEqual([
      ['Blockquote', 0],
      ['Code Block', 5],
    ])
  })

  it('refuses a match that starts mid-word, and one nothing carries', () => {
    expect(filterBlockMenu(seated, 'od')).toEqual([])
    expect(filterBlockMenu(seated, 'zz')).toEqual([])
  })

  it('keeps everything at 0 for an empty query', () => {
    const all = filterBlockMenu(seated, '')
    expect(all.map((s) => s.title)).toEqual(seated.map((s) => s.title))
    expect(all.flatMap((s) => s.rows)).toHaveLength(16)
    expect(all.flatMap((s) => s.rows).every((r) => r.at === 0)).toBe(true)
  })
})
