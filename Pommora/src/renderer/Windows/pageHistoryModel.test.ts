import { describe, it, expect } from 'vitest'
import { historyRowModel } from './pageHistoryModel'

describe('historyRowModel', () => {
  it('shows Current Version with nothing checked, restore off', () => {
    expect(historyRowModel(new Set())).toEqual({ shown: null, restoreEnabled: false })
  })

  it('one check shows it and enables restore', () => {
    expect(historyRowModel(new Set([20]))).toEqual({ shown: 20, restoreEnabled: true })
  })

  it('a multi-check shows the last checked and dims restore', () => {
    expect(historyRowModel(new Set([10, 30]))).toEqual({ shown: 30, restoreEnabled: false })
  })

  it('an uncheck falls back to the most recently checked survivor', () => {
    const checked = new Set([10, 20, 30])
    checked.delete(30)
    expect(historyRowModel(checked).shown).toBe(20)
  })

  it('a re-check counts as the latest', () => {
    const checked = new Set([10, 20])
    checked.delete(10)
    checked.add(10)
    expect(historyRowModel(checked).shown).toBe(10)
  })
})
