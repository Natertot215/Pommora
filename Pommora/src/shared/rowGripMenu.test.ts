import { describe, expect, it } from 'vitest'
import { rowGripMenuModel } from './rowGripMenu'

describe('rowGripMenuModel', () => {
  it('carries the ratified order with separators between its blocks', () => {
    const items = rowGripMenuModel({
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    }).items
    expect(items.map((i) => [i.label, i.action])).toEqual([
      ['Open Preview', 'title:preview'],
      ['Open New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Change Icon', 'title:icon'],
      ['New Page Above', 'title:newabove'],
      ['New Page Below', 'title:newbelow'],
      ['Move To', 'title:moveto'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['Delete', 'title:delete'],
    ])
    expect(items.filter((i) => i.separatorBefore).map((i) => i.label)).toEqual([
      'Rename',
      'New Page Above',
      'Move To',
      'Delete',
    ])
  })

  it('drops Move To where nothing was offered, and the copies open the block instead', () => {
    const items = rowGripMenuModel({}).items
    expect(items.map((i) => i.action)).not.toContain('title:moveto')
    expect(items.find((i) => i.action === 'title:copylink')?.separatorBefore).toBe(true)
  })

  it('an already-open page reads Open', () => {
    expect(rowGripMenuModel({ alreadyOpen: true }).items[1].label).toBe('Open')
  })
})
