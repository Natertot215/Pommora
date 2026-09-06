import { describe, it, expect } from 'vitest'
import { mergeStyleRecords } from './viewMerge'

describe('mergeStyleRecords', () => {
  it('folds per-KEY — a partial override never wipes a saved sibling key', () => {
    const out = mergeStyleRecords(
      { a: { look: 'compact', date_format: 'short' } },
      { a: { time_format: 'twelveHour' } },
    )
    expect(out.a).toEqual({ look: 'compact', date_format: 'short', time_format: 'twelveHour' })
  })

  it('keeps untouched columns and lets the override key win', () => {
    const out = mergeStyleRecords(
      { a: { look: 'standard' }, b: { look: 'checkbox' } },
      { a: { look: 'compact' } },
    )
    expect(out).toEqual({ a: { look: 'compact' }, b: { look: 'checkbox' } })
  })
})
