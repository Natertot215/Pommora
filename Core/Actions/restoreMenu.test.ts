import { describe, expect, it } from 'vitest'
import { restoreMenuItems } from './restoreMenu'

describe('the restore menu', () => {
  it('restores and deletes one row, the plural for a batch', () => {
    expect(restoreMenuItems({ batch: false })).toEqual([
      { label: 'Restore', action: 'restore' },
      { label: 'Delete', action: 'delete', separatorBefore: true },
    ])
    expect(restoreMenuItems({ batch: true }).map((i) => [i.label, i.action])).toEqual([
      ['Restore All', 'restore'],
      ['Delete All', 'delete'],
    ])
  })

  it('a homeless row turns Restore into a destination drill keyed by id', () => {
    const items = restoreMenuItems({
      batch: false,
      destinations: [
        {
          id: 'c1',
          label: 'Notes',
          path: 'Notes',
          children: [{ id: 's1', label: 'Sub', path: 'Notes/Sub' }],
        },
      ],
    })
    const notes = items[0].submenu?.[0]
    expect(notes?.submenu?.map((r) => [r.label, r.action, r.separatorBefore])).toEqual([
      ['Notes', 'restoreTo:c1', undefined],
      ['Sub', 'restoreTo:s1', true],
    ])
  })

  it('nowhere to put it keeps the row, refused', () => {
    expect(restoreMenuItems({ batch: false, destinations: [] })[0]).toEqual({
      label: 'Restore',
      submenu: [],
    })
  })

  it('where one item restores at a time, a batch offers Delete All alone', () => {
    expect(restoreMenuItems({ batch: true, restoresBatch: false })).toEqual([
      { label: 'Delete All', action: 'delete' },
    ])
    expect(restoreMenuItems({ batch: false, restoresBatch: false })).toEqual([
      { label: 'Restore', action: 'restore' },
      { label: 'Delete', action: 'delete', separatorBefore: true },
    ])
  })
})
