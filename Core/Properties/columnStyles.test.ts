import { describe, expect, it } from 'vitest'
import {
  columnStyle,
  DATE_FORMATS,
  dateDefaults,
  defaultStyleFor,
  WEEKDAY_FORMATS,
} from './columnStyles'

describe('COLUMN_LOOKS', () => {
  it('parses a bar look on a column style', () => {
    expect(columnStyle.parse({ look: 'bar' }).look).toBe('bar')
  })
})

describe('defaultStyleFor', () => {
  it('gives each look-bearing type its default look, and a file column none', () => {
    expect(defaultStyleFor('status')).toEqual({ look: 'standard' })
    expect(defaultStyleFor('checkbox')).toEqual({ look: 'checkbox' })
    expect(defaultStyleFor('link')).toEqual({ look: 'link-full' })
    expect(defaultStyleFor('file')).toEqual({})
  })

  // A Link column reads the way its property says to unless its view says otherwise, so the default resolves to the property's own Format rather than a constant.
  it('takes a link column’s default from the property’s own Format', () => {
    expect(defaultStyleFor('link', { link_display: 'link-title' })).toEqual({ look: 'link-title' })
  })

  it("a date style defaults to the Nexus's form with no time and no weekday", () => {
    expect(dateDefaults('relative')).toEqual({
      date_format: 'relative',
      time_format: 'none',
      weekday: 'none',
    })
  })

  it('numbers default to the number look', () => {
    expect(defaultStyleFor('number')).toEqual({ look: 'number' })
  })

  it('select/multi default to the Standard option look', () => {
    expect(defaultStyleFor('select')).toEqual({ look: 'standard' })
    expect(defaultStyleFor('multiSelect')).toEqual({ look: 'standard' })
  })

  it('an unknown type is not style-addressable', () => {
    expect(defaultStyleFor(undefined)).toEqual({})
  })
})

describe('columnStyle codec', () => {
  it('round-trips a full entry', () => {
    const entry = {
      look: 'compact',
      date_format: 'short',
      time_format: 'twelveHour',
      weekday: 'short',
    }
    expect(columnStyle.parse(entry)).toEqual(entry)
  })

  it('drops an unknown enum value instead of sinking the entry', () => {
    expect(columnStyle.parse({ look: 'zebra', date_format: 'short' })).toEqual({
      date_format: 'short',
    })
  })
})

describe('columnStyle weekday + relative', () => {
  it('parses a weekday field', () => {
    expect(columnStyle.parse({ weekday: 'long' })).toEqual({ weekday: 'long' })
  })
  it('drops an unknown weekday to undefined (lenient catch)', () => {
    expect(columnStyle.parse({ weekday: 'bogus' }).weekday).toBeUndefined()
  })
  it('relative is a date format; long/short/none are weekday formats', () => {
    expect(DATE_FORMATS).toContain('relative')
    expect(WEEKDAY_FORMATS).toEqual(['long', 'short', 'none'])
  })
})

// Compiled by the typecheck and never run: a field the decoder doesn't declare is no field of the type.
const _mistypedStyleField = (s: ReturnType<typeof columnStyle.parse>): unknown =>
  // @ts-expect-error
  s.lok
