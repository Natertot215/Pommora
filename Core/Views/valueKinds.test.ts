import { describe, expect, it } from 'vitest'
import type { DateGranularity } from './views'
import { CREATABLE_TYPES } from '../Properties/properties'
import { groupable, groupKeyToValue, operatorsFor, reassignable, VALUE_KINDS } from './valueKinds'
import { UNGROUPED } from './viewRow'

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

describe('groupKeyToValue — destination group key → PropertyValue', () => {
  it('status: the key is the status value', () => {
    expect(groupKeyToValue('opt_done', 'status')).toEqual({ kind: 'select', value: 'opt_done' })
  })

  it('select: the key is the select value', () => {
    expect(groupKeyToValue('opt_red', 'select')).toEqual({ kind: 'select', value: 'opt_red' })
  })

  it('checkbox: the true key checks, any other key clears — a checkbox is true or absent', () => {
    expect(groupKeyToValue('true', 'checkbox')).toEqual({ kind: 'checkbox', value: true })
    expect(groupKeyToValue('false', 'checkbox')).toBeNull()
  })

  it('the no-value band clears the property (null)', () => {
    expect(groupKeyToValue(UNGROUPED, 'status')).toBeNull()
    expect(groupKeyToValue(UNGROUPED, 'select')).toBeNull()
  })

  it('an un-reassignable type yields null (caller gates these out)', () => {
    expect(groupKeyToValue('2026-06', 'dateTime')).toBeNull()
    expect(groupKeyToValue('x', undefined)).toBeNull()
  })

  it('reassignable holds for Status, Select and Checkbox and nothing else', () => {
    for (const t of ['status', 'select', 'checkbox'] as const) expect(reassignable(t)).toBe(true)
    for (const t of [
      'dateTime',
      'createdTime',
      'lastEditedTime',
      'number',
      'multiSelect',
      'context',
      'link',
      'text',
      'file',
      'title',
      undefined,
    ] as const)
      expect(reassignable(t)).toBe(false)
  })
})

describe('operatorsFor', () => {
  it("text reads Link's seven operators", () => {
    expect(operatorsFor('prop_notes', 'text')).toEqual(operatorsFor('prop_url', 'link'))
    expect(operatorsFor('prop_notes', 'text')).toHaveLength(7)
  })

  it('checkbox operators carry the whole clause (slot none, implied values)', () => {
    const ops = operatorsFor('prop_done', 'checkbox')
    expect(ops.map((o) => o.label)).toEqual(['Is Checked', "Isn't Checked"])
    expect(ops.every((o) => o.slot === 'none')).toBe(true)
    expect(ops.map((o) => o.impliedValue)).toEqual(['true', 'false'])
  })

  it("select reads Is / Isn't / Is Empty / Isn't Empty with chip slots on the membership ops", () => {
    const ops = operatorsFor('prop_sel', 'select')
    expect(ops.map((o) => o.label)).toEqual(['Is', "Isn't", 'Is Empty', "Isn't Empty"])
    expect(ops[0].slot).toBe('chips')
    expect(ops[2].slot).toBe('none')
  })

  it("multi-select reads Is Any / Is All / Isn't + empties", () => {
    expect(operatorsFor('prop_tags', 'multiSelect').map((o) => o.op)).toEqual([
      'contains_any',
      'contains_all',
      'does_not_contain',
      'is_empty',
      'is_not_empty',
    ])
  })

  it("a Context reads Is Any / Is All / Isn't + empties", () => {
    const ops = operatorsFor('ctx-crew', 'context')
    expect(ops.map((o) => o.label)).toEqual([
      'Is Any',
      'Is All',
      "Isn't",
      'Is Empty',
      "Isn't Empty",
    ])
    expect(ops.slice(0, 3).map((o) => o.op)).toEqual([
      'contains_any',
      'contains_all',
      'does_not_contain',
    ])
    expect(ops[0].slot).toBe('chips')
  })

  it("Location Contains and Doesn't Contain take folder names; Is and Isn't take ids alone", () => {
    const ops = operatorsFor('_location', undefined)
    expect(ops.map((o) => [o.label, o.names])).toEqual([
      ['Is', undefined],
      ["Isn't", undefined],
      ['Contains', true],
      ["Doesn't Contain", true],
    ])
  })
})
