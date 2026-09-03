import { describe, it, expect } from 'vitest'
import { historyRowModel } from './pageHistoryModel'

describe('historyRowModel', () => {
  it('nothing checked: no restore target', () => {
    expect(historyRowModel(new Set()).restoreTarget).toBeNull()
  })

  it('one check is the restore target', () => {
    expect(historyRowModel(new Set([20])).restoreTarget).toBe(20)
  })

  it('a multi-check has no restore target', () => {
    expect(historyRowModel(new Set([10, 30])).restoreTarget).toBeNull()
  })
})
