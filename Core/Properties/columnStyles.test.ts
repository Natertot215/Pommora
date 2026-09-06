import { describe, expect, it } from 'vitest'
import {
  COLUMN_LOOKS,
  columnStyle,
  DATE_FORMATS,
  defaultStyleFor,
  WEEKDAY_FORMATS,
} from './columnStyles'

describe('COLUMN_LOOKS', () => {
  it('includes the number looks', () => {
    expect(COLUMN_LOOKS).toContain('number')
    expect(COLUMN_LOOKS).toContain('bar')
  })
  it('parses a bar look on a column style', () => {
    expect(columnStyle.parse({ look: 'bar' }).look).toBe('bar')
  })
})

describe('defaultStyleFor', () => {
  it('gives each look-bearing type its default look', () => {
    expect(defaultStyleFor('status')).toEqual({ look: 'standard' })
    expect(defaultStyleFor('checkbox')).toEqual({ look: 'checkbox' })
    expect(defaultStyleFor('url')).toEqual({ look: 'link-full' })
  })

  // A url column reads the way its property says to unless its view says otherwise, so the default resolves to the property's own Format rather than a constant.
  it('takes a url column’s default from the property’s own Format', () => {
    expect(defaultStyleFor('url', { link_display: 'link-title' })).toEqual({ look: 'link-title' })
  })

  it('drops a look saved under the vocabulary this replaced', () => {
    expect(columnStyle.parse({ look: 'full' }).look).toBeUndefined()
    expect(columnStyle.parse({ look: 'title' }).look).toBeUndefined()
  })

  it('drops the looks a file column used to carry, and offers it no default', () => {
    expect(columnStyle.parse({ look: 'filename' }).look).toBeUndefined()
    expect(columnStyle.parse({ look: 'path' }).look).toBeUndefined()
    expect(defaultStyleFor('file')).toEqual({})
  })

  it('gives the date-shaped types the full-date, no-time, no-weekday format defaults', () => {
    expect(defaultStyleFor('datetime')).toEqual({
      date_format: 'full',
      time_format: 'none',
      weekday: 'none',
    })
    expect(defaultStyleFor('last_edited_time')).toEqual({
      date_format: 'full',
      time_format: 'none',
      weekday: 'none',
    })
  })

  it('numbers default to the number look', () => {
    expect(defaultStyleFor('number')).toEqual({ look: 'number' })
  })

  it('select/multi default to the Standard option look', () => {
    expect(defaultStyleFor('select')).toEqual({ look: 'standard' })
    expect(defaultStyleFor('multi_select')).toEqual({ look: 'standard' })
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

  it('lets unknown keys ride through', () => {
    expect(columnStyle.parse({ look: 'standard', outside_key: true })).toEqual({
      look: 'standard',
      outside_key: true,
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
