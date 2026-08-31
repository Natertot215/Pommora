import { describe, expect, it } from 'vitest'
import { tableMenuItems } from './tableMenu'

const labels = (ctx: Parameters<typeof tableMenuItems>[0]): string[] =>
  tableMenuItems(ctx).map((r) => r.label)

describe('a markdown table grip’s menu', () => {
  it('speaks for the whole table from the header corner — copies, clears, delete', () => {
    const rows = tableMenuItems({ kind: 'header', index: 0 })
    expect(rows.map((r) => r.label)).toEqual([
      'Copy Outline',
      'Copy Content',
      'Clear Row',
      'Clear Table',
      'Delete',
    ])
    expect(rows.filter((r) => r.separatorBefore).map((r) => r.action)).toEqual([
      'table:clear-header',
      'table:delete',
    ])
  })

  it('leads a row’s menu with Copy, then the inserts, then the destructive pair', () => {
    const rows = tableMenuItems({ kind: 'row', index: 2 })
    expect(rows.map((r) => r.action)).toEqual([
      'row:copy',
      'row:insert-above',
      'row:insert-below',
      'row:clear',
      'row:delete',
    ])
    expect(rows.filter((r) => r.separatorBefore).map((r) => r.action)).toEqual([
      'row:insert-above',
      'row:clear',
    ])
  })

  it('leads a column’s menu with Copy', () => {
    expect(tableMenuItems({ kind: 'column', index: 1 })[0].action).toBe('col:copy')
  })

  it('marks the alignment in force', () => {
    const align = tableMenuItems({ kind: 'column', index: 1, align: 'center' })[1]
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
