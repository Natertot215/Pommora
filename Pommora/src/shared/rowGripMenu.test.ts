import { describe, expect, it } from 'vitest'
import { rowGripMenuModel } from './rowGripMenu'

describe('rowGripMenuModel', () => {
  it('carries the ratified order with separators between its blocks', () => {
    const items = rowGripMenuModel({}).items
    expect(items.map((i) => [i.label, i.action])).toEqual([
      ['Open Preview', 'title:preview'],
      ['Open New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Change Icon', 'title:icon'],
      ['New Page Above', 'title:newabove'],
      ['New Page Below', 'title:newbelow'],
      ['Delete', 'title:delete'],
    ])
    expect(items.filter((i) => i.separatorBefore).map((i) => i.label)).toEqual([
      'Rename',
      'New Page Above',
      'Delete',
    ])
  })

  it('an already-open page reads Open', () => {
    expect(rowGripMenuModel({ alreadyOpen: true }).items[1].label).toBe('Open')
  })
})
