import { describe, expect, it } from 'vitest'
import { trashColumnMenuItems, trashMenuItems } from './trashMenu'

describe('the trash row menu', () => {
  it('restores and deletes one row, the plural for a batch', () => {
    expect(trashMenuItems({ batch: false })).toEqual([
      { label: 'Restore', action: 'restore' },
      { label: 'Delete', action: 'delete', separatorBefore: true },
    ])
    expect(trashMenuItems({ batch: true }).map((i) => [i.label, i.action])).toEqual([
      ['Restore All', 'restoreAll'],
      ['Delete All', 'deleteAll'],
    ])
  })

  it('a homeless row turns Restore into a destination drill keyed by id', () => {
    const items = trashMenuItems({
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
    expect(trashMenuItems({ batch: false, destinations: [] })[0]).toMatchObject({
      label: 'Restore',
      disabled: true,
    })
  })
})

describe('the trash date column menu', () => {
  it('offers the format set with the one in force, and the time toggle named for its move', () => {
    const items = trashColumnMenuItems({ format: 'full', timeShown: true })
    expect(items[0].submenu?.map((r) => [r.action, r.checked])).toEqual([
      ['format:monthDayYear', false],
      ['format:full', true],
    ])
    expect(items[1]).toEqual({ label: 'Hide Time', action: 'toggleTime' })
    expect(trashColumnMenuItems({ format: 'full', timeShown: false })[1].label).toBe('Show Time')
  })
})
