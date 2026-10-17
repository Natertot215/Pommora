import { describe, expect, it } from 'vitest'
import { asRenderableIcon } from '@pommora/uix/Symbols'
import { BLOCK_MENU_SECTIONS, filterBlockMenu, insertRows } from './blockMenu'

const seated = BLOCK_MENU_SECTIONS

describe('the block menu catalog', () => {
  it('titles five sections and lists their rows in order', () => {
    expect(seated.map((s) => s.title)).toEqual(['Headings', 'Lists', 'Link', 'Insert', 'Embed'])
    expect(seated[0].rows.map((r) => r.label)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
      'Heading 6',
    ])
    expect(seated[1].rows.map((r) => r.label)).toEqual([
      'Bullet List',
      'Numbered List',
      'Alphabetical List',
      'Task List',
      'Arrowed List',
    ])
    expect(seated[2].rows.map((r) => r.label)).toEqual([
      'Connection',
      'Markdown Link',
      'External Link',
    ])
    expect(seated[3].rows.map((r) => r.label)).toEqual([
      'Blockquote',
      'Callout',
      'Code Block',
      'Table',
      'Horizontal Rule',
      'Footnote',
    ])
    expect(seated[4].rows.map((r) => r.label)).toEqual(['Internal Page', 'External Link'])
  })

  it('offers Footnote only where a marker can bind', () => {
    expect(seated.flatMap((s) => s.rows)).toHaveLength(22)
    expect(insertRows(false).map((r) => r.label)).not.toContain('Footnote')
  })

  it('names an icon the registry resolves on every row', () => {
    for (const row of seated.flatMap((s) => s.rows)) {
      expect(asRenderableIcon(row.icon)).toBe(row.icon)
    }
  })
})

describe('the block menu filter', () => {
  const labels = (m: ReturnType<typeof filterBlockMenu>[number]): string[] =>
    m.rows.map((r) => r.label)

  it('keeps a section whose rows match and drops the rest', () => {
    const hea = filterBlockMenu('hea')
    expect(hea.map((s) => s.title)).toEqual(['Headings', 'Lists'])
    expect(hea[0].rows).toHaveLength(6)
    expect(labels(hea[1])).toEqual(['Alphabetical List'])
    expect(filterBlockMenu('HEA')).toEqual(hea)
  })

  it('ranks the rows by their match, each section seated where its best row falls', () => {
    const bl = filterBlockMenu('bl')
    expect(bl.map((s) => s.title)).toEqual(['Insert', 'Lists', 'Embed'])
    expect(labels(bl[0])).toEqual(['Blockquote', 'Code Block', 'Table'])
    expect(labels(bl[1])).toEqual(['Bullet List', 'Numbered List', 'Alphabetical List'])
    expect(labels(bl[2])).toEqual(['External Link', 'Internal Page'])
    expect(filterBlockMenu('hr')).toEqual([
      { title: 'Insert', rows: [expect.objectContaining({ label: 'Horizontal Rule' })] },
    ])
    expect(labels(filterBlockMenu('quo')[0])).toEqual(['Blockquote'])
  })

  it('seats the row a query names first, ahead of the rows its letters scatter through', () => {
    for (const [query, label] of [
      ['tab', 'Table'],
      ['int', 'Internal Page'],
      ['call', 'Callout'],
    ])
      expect(filterBlockMenu(query)[0].rows[0].label).toBe(label)
  })

  it('refuses a query nothing carries', () => {
    expect(filterBlockMenu('zz')).toEqual([])
  })

  it('keeps a whole section whose title matches', () => {
    const link = filterBlockMenu('link')
    expect(link.map((s) => s.title)).toEqual(['Link', 'Embed'])
    expect(labels(link[0])).toEqual(['Markdown Link', 'External Link', 'Connection'])
    expect(labels(link[1])).toEqual(['External Link'])

    const embed = filterBlockMenu('embed')
    expect(embed.map((s) => s.title)).toEqual(['Embed'])
    expect(labels(embed[0])).toEqual(['External Link', 'Internal Page'])
  })

  it('ranks by the name alone where the name matches, the shorter label first on a tie', () => {
    const list = filterBlockMenu('list')
    expect(list.map((s) => s.title)).toEqual(['Lists'])
    expect(labels(list[0])).toEqual([
      'Task List',
      'Arrowed List',
      'Numbered List',
      'Bullet List',
      'Alphabetical List',
    ])
  })

  it('lists the menu as it stands for an empty query', () => {
    expect(filterBlockMenu('')).toBe(seated)
  })
})
