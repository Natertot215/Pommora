import { describe, it, expect } from 'vitest'
import { fileHistoryMenuItems } from './fileHistoryMenu'

describe('the history row menu', () => {
  it('offers Restore and Delete for one row', () => {
    expect(fileHistoryMenuItems(false)).toEqual([
      { label: 'Restore', action: 'restore' },
      { label: 'Delete', action: 'delete', separatorBefore: true },
    ])
  })

  it('offers only Delete All for a multi-check', () => {
    expect(fileHistoryMenuItems(true)).toEqual([{ label: 'Delete All', action: 'delete' }])
  })
})
