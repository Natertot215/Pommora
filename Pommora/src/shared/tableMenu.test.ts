import { describe, expect, it } from 'vitest'
import { tableMenuItems } from './tableMenu'

const labels = (ctx: Parameters<typeof tableMenuItems>[0]): string[] =>
  tableMenuItems(ctx).map((r) => r.label)

describe('a markdown table grip’s menu', () => {
  it('offers only the table itself from the header corner', () => {
    expect(labels({ kind: 'header', index: 0 })).toEqual(['Delete Table'])
  })

  it('separates a row’s destructive pair from the two that insert', () => {
    const rows = tableMenuItems({ kind: 'row', index: 2 })
    expect(rows.map((r) => r.action)).toEqual([
      'row:insert-above',
      'row:insert-below',
      'row:clear',
      'row:delete',
    ])
    expect(rows.filter((r) => r.separatorBefore).map((r) => r.action)).toEqual(['row:clear'])
  })

  it('marks the alignment in force', () => {
    const align = tableMenuItems({ kind: 'column', index: 1, align: 'center' })[0]
    expect(align.submenu?.map((r) => [r.label, r.checked])).toEqual([
      ['Left', false],
      ['Center', true],
      ['Right', false],
    ])
  })

  // The first column alone can read as the header row, and the label states the state it is in.
  it('offers the heading toggle on the first column only', () => {
    expect(labels({ kind: 'column', index: 1 })).not.toContain('Make Heading Column')
    expect(labels({ kind: 'column', index: 0 })).toContain('Make Heading Column')
    expect(labels({ kind: 'column', index: 0, headingColumn: true })).toContain('Heading Column')
  })
})
