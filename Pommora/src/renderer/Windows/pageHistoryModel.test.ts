import { describe, it, expect } from 'vitest'
import type { SnapshotRow } from '@shared/types'
import { historyRowModel } from './pageHistoryModel'

const rows: SnapshotRow[] = [
  { ts: 30, source: 'edit' },
  { ts: 20, source: 'external' },
  { ts: 10, source: 'edit' },
]

describe('historyRowModel', () => {
  it('nothing checked: restore off, no glyphs', () => {
    const m = historyRowModel(rows, new Set())
    expect(m.checkedLive).toEqual([])
    expect(m.restoreEnabled).toBe(false)
    expect(m.glyphOn(30)).toBe(false)
  })

  it('one check enables restore and its glyph alone', () => {
    const m = historyRowModel(rows, new Set([20]))
    expect(m.restoreEnabled).toBe(true)
    expect(m.glyphOn(20)).toBe(true)
    expect(m.glyphOn(30)).toBe(false)
  })

  it('a multi-check dims restore and glyphs every checked row', () => {
    const m = historyRowModel(rows, new Set([10, 30]))
    expect(m.checkedLive).toEqual([10, 30])
    expect(m.restoreEnabled).toBe(false)
    expect(m.glyphOn(10)).toBe(true)
    expect(m.glyphOn(30)).toBe(true)
  })

  it('a checked row no longer listed counts for nothing', () => {
    const m = historyRowModel(rows, new Set([99]))
    expect(m.checkedLive).toEqual([])
    expect(m.restoreEnabled).toBe(false)
    expect(m.glyphOn(99)).toBe(false)
  })
})
