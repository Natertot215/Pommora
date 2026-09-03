import { describe, it, expect } from 'vitest'
import type { SnapshotRow } from '@shared/types'
import { historyRowModel } from './pageHistoryModel'

const rows: SnapshotRow[] = [
  { ts: 30, source: 'edit' },
  { ts: 20, source: 'external' },
  { ts: 10, source: 'edit' },
]

describe('historyRowModel', () => {
  it('shows Current Version with nothing checked, restore off, no glyphs', () => {
    const m = historyRowModel(rows, new Set(), null)
    expect(m.shown).toBeNull()
    expect(m.restoreEnabled).toBe(false)
    expect(m.glyphOn(30)).toBe(false)
  })

  it('follows the last check; one check enables restore', () => {
    const m = historyRowModel(rows, new Set([20]), 20)
    expect(m.shown).toBe(20)
    expect(m.restoreEnabled).toBe(true)
    expect(m.glyphOn(20)).toBe(true)
    expect(m.glyphOn(30)).toBe(false)
  })

  it('a multi-check shows the last checked and dims restore', () => {
    const m = historyRowModel(rows, new Set([10, 30]), 30)
    expect(m.shown).toBe(30)
    expect(m.checkedLive).toEqual([10, 30])
    expect(m.restoreEnabled).toBe(false)
  })

  it('an uncheck falls back to the most recently checked survivor, then to Current Version', () => {
    expect(historyRowModel(rows, new Set([10, 20]), 30).shown).toBe(20)
    expect(historyRowModel(rows, new Set(), 30).shown).toBeNull()
  })

  it('a checked row no longer listed counts for nothing', () => {
    const m = historyRowModel(rows, new Set([99]), 99)
    expect(m.shown).toBeNull()
    expect(m.checkedLive).toEqual([])
    expect(m.glyphOn(99)).toBe(false)
  })
})
