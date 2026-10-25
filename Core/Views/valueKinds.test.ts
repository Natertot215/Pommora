import { describe, expect, it } from 'vitest'
import type { DateGranularity } from './views'
import { CREATABLE_TYPES } from '../Properties/properties'
import { groupable, VALUE_KINDS } from './valueKinds'

const bucket = (iso: string, g: DateGranularity) =>
  VALUE_KINDS.dateTime.bucket?.({ kind: 'dateTime', value: iso }, g)

describe('groupable', () => {
  it('groups by Select, Status and Date only', () => {
    expect(CREATABLE_TYPES.filter(groupable)).toEqual(['dateTime', 'select', 'status'])
  })
})

describe('the Date bucket', () => {
  it('formats month and year keys (zero-padded, lexicographically chronological)', () => {
    expect(bucket('2026-06-15T12:00:00Z', 'month')).toBe('2026-06')
    expect(bucket('2026-06-15T12:00:00Z', 'year')).toBe('2026')
  })

  it('formats day and week keys with the right shape', () => {
    expect(bucket('2026-06-15T12:00:00Z', 'day')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(bucket('2026-06-15T12:00:00Z', 'week')).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('returns null for an unparseable date', () => {
    expect(bucket('not-a-date', 'month')).toBeNull()
  })

  it('buckets a date-only value by its stored calendar date in any timezone', () => {
    expect(bucket('2026-06-27', 'day')).toBe('2026-06-27')
    expect(bucket('2026-06-27', 'month')).toBe('2026-06')
    expect(bucket('2026-06-27', 'year')).toBe('2026')
    // 2026-01-01 is a Thursday → ISO week 1; 2025-12-31 (Wed) shares it (its Thursday is Jan 1).
    expect(bucket('2026-01-01', 'week')).toBe('2026-W01')
    expect(bucket('2025-12-31', 'week')).toBe('2026-W01')
  })

  it('buckets a zoned value by the local day its cell shows', () => {
    const lateEvening = new Date(2026, 5, 14, 23, 30)
    expect(bucket(lateEvening.toISOString(), 'day')).toBe('2026-06-14')
  })
})
