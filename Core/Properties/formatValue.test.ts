import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatNumber,
  fractionDenominator,
  barDivisor,
  numberFormatGlyph,
  readDate,
  readNumber,
  spelledNumber,
} from './formatValue'
import { CURRENCY_CODES } from './properties'

describe('formatDate', () => {
  it('renders the four date formats', () => {
    expect(formatDate('2026-03-01', 'short', 'none')).toBe('March 1st')
    expect(formatDate('2026-03-01', 'full', 'none')).toBe('March 1st, 2026')
    expect(formatDate('2026-03-01', 'dayMonthYear', 'none')).toBe('01/03/2026')
    expect(formatDate('2026-03-01', 'monthDayYear', 'none')).toBe('03/01/2026')
  })

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [31, '31st'],
  ])('ordinal day %i renders %s', (day, expected) => {
    expect(formatDate(`2026-03-${String(day).padStart(2, '0')}`, 'short', 'none')).toBe(
      `March ${expected}`,
    )
  })

  it('appends the time per the time format when the value carries one', () => {
    expect(formatDate('2026-03-01T15:45:00', 'short', 'twelveHour')).toBe('March 1st 3:45 PM')
    expect(formatDate('2026-03-01T15:45:00', 'short', 'twentyFourHour')).toBe('March 1st 15:45')
    expect(formatDate('2026-03-01T15:45:00', 'short', 'none')).toBe('March 1st')
  })

  it('never invents a time for a date-only value', () => {
    expect(formatDate('2026-03-01', 'short', 'twelveHour')).toBe('March 1st')
  })

  it('falls back to the raw string for an unparseable value', () => {
    expect(formatDate('not-a-date', 'short', 'none')).toBe('not-a-date')
  })
})

describe('formatDate weekday + reshaped full', () => {
  const iso = '2026-07-06'
  it('full is weekday-free: Month Ordinal, Year', () => {
    expect(formatDate(iso, 'full', 'none')).toBe('July 6th, 2026')
  })
  it('short is Month Ordinal', () => {
    expect(formatDate(iso, 'short', 'none')).toBe('July 6th')
  })
  it('long weekday prepends on full', () => {
    expect(formatDate(iso, 'full', 'none', 'long')).toBe('Monday, July 6th, 2026')
  })
  it('short weekday prepends on short', () => {
    expect(formatDate(iso, 'short', 'none', 'short')).toBe('Mon, July 6th')
  })
  it('weekday is ignored on numeric formats', () => {
    expect(formatDate(iso, 'monthDayYear', 'none', 'long')).toBe('07/06/2026')
  })
  it('weekday none adds nothing', () => {
    expect(formatDate(iso, 'full', 'none', 'none')).toBe('July 6th, 2026')
  })
})

describe('formatDate relative', () => {
  const now = new Date('2026-07-06T12:00:00')
  const rel = (iso: string, time: 'none' | 'twelveHour' = 'none') =>
    formatDate(iso, 'relative', time, 'none', now)
  it('today / yesterday / tomorrow', () => {
    expect(rel('2026-07-06')).toBe('Today')
    expect(rel('2026-07-05')).toBe('Yesterday')
    expect(rel('2026-07-07')).toBe('Tomorrow')
  })
  it('within a week counts days both directions', () => {
    expect(rel('2026-07-03')).toBe('3 Days Ago')
    expect(rel('2026-07-09')).toBe('3 Days from now')
  })
  it('past a week rolls to weeks / months / years', () => {
    expect(rel('2026-06-20')).toBe('2 Weeks Ago')
    expect(rel('2026-04-06')).toBe('3 Months Ago')
    expect(rel('2024-07-06')).toBe('2 Years Ago')
  })
  it('time-shown appends the clock within a week, drops it past a week', () => {
    expect(rel('2026-07-06T15:30:00', 'twelveHour')).toBe('Today at 3:30 PM')
    expect(rel('2026-07-05T15:30:00', 'twelveHour')).toBe('Yesterday at 3:30 PM')
    expect(rel('2026-06-20T15:30:00', 'twelveHour')).toBe('2 Weeks Ago')
  })
})

describe('readDate', () => {
  it('reads a bare day as local midnight, untimed', () => {
    expect(readDate('2026-06-15')).toEqual({ at: new Date(2026, 5, 15), timed: false })
  })
  it('reads a time as written, zone honored', () => {
    const at = new Date(2026, 5, 14, 23, 30)
    expect(readDate('2026-06-14T23:30:00')).toEqual({ at, timed: true })
    expect(readDate(at.toISOString())).toEqual({ at, timed: true })
  })
  it('reads a space-separated time', () => {
    expect(readDate('2026-06-14 23:30')).toEqual({
      at: new Date(2026, 5, 14, 23, 30),
      timed: true,
    })
  })
  it('reads a time without seconds', () => {
    expect(readDate('2026-06-14T23:30')).toEqual({ at: new Date(2026, 5, 14, 23, 30), timed: true })
  })
  it('is null for anything but an ISO day or date-time', () => {
    for (const text of ['someday', 'Phase 2', '2026', '2026-06', 'June 15, 2026', '6/15/2026'])
      expect(readDate(text)).toBeNull()
  })
})

describe('readDate span', () => {
  it('reads an ISO interval as a start and an end', () => {
    expect(readDate('2026-06-15/2026-06-18')).toEqual({
      at: new Date(2026, 5, 15),
      timed: false,
      end: new Date(2026, 5, 18),
    })
    expect(readDate('2026-06-15T09:00:00/2026-06-15T17:00:00')).toEqual({
      at: new Date(2026, 5, 15, 9),
      timed: true,
      end: new Date(2026, 5, 15, 17),
    })
  })

  it('orders a hand-written span chronologically', () => {
    expect(readDate('2026-06-18/2026-06-15')).toEqual({
      at: new Date(2026, 5, 15),
      timed: false,
      end: new Date(2026, 5, 18),
    })
  })

  it('reads a hand-spaced span, timed when either end carries a clock', () => {
    expect(readDate('2026-06-15 / 2026-06-18')?.end).toEqual(new Date(2026, 5, 18))
    expect(readDate('2026-06-15/2026-06-18T17:00')).toEqual({
      at: new Date(2026, 5, 15),
      timed: true,
      end: new Date(2026, 5, 18, 17),
    })
  })

  it('names no date when either end is unreadable', () => {
    for (const text of [
      '2026-06-15/',
      '2026-06-15/P3D',
      '/2026-06-15',
      '2026-06-15/2026-06-16/2026-06-17',
    ])
      expect(readDate(text)).toBeNull()
  })
})

describe('formatDate span', () => {
  it('formats a span as its start → its end, and one inside a day with the end clock alone', () => {
    expect(formatDate('2026-03-01/2026-03-04', 'short', 'none')).toBe('March 1st → March 4th')
    expect(formatDate('2026-03-01T09:00:00/2026-03-01T17:30:00', 'short', 'twelveHour')).toBe(
      'March 1st 9:00 AM → 5:30 PM',
    )
  })

  it('shows a span inside one day once when its clock is hidden or absent', () => {
    expect(formatDate('2026-03-01T09:00:00/2026-03-01T17:30:00', 'short', 'none')).toBe('March 1st')
    expect(formatDate('2026-03-01/2026-03-01', 'short', 'none')).toBe('March 1st')
  })
})

describe('formatNumber', () => {
  const shown = (...args: Parameters<typeof formatNumber>): string =>
    formatNumber(...args)
      .map((p) => p.text)
      .join('')

  it('groups by default and honors separators off', () => {
    expect(shown(1234.5, { number_family: 'number', number_separators: true })).toBe('1,234.5')
    expect(shown(1234.5, { number_family: 'number', number_separators: false })).toBe('1234.5')
  })
  it('hidden decimals show as an integer; a fixed count pads', () => {
    expect(shown(3.14, { number_decimals: 'hidden' })).toBe('3')
    expect(shown(3, { number_decimals: 2 })).toBe('3.00')
  })
  it('percent is literal + "%", never ×100', () => {
    expect(shown(30, { number_family: 'percent' })).toBe('30%')
  })
  it('currency uses the chosen ISO code', () => {
    expect(
      shown(1234, { number_family: 'currency', number_currency: 'GBP', number_decimals: 2 }),
    ).toBe('£1,234.00')
  })
  it('fraction renders "N out of Value"', () => {
    expect(
      shown(3, { number_family: 'number', number_fraction: true, number_denominator: 10 }),
    ).toBe('3 out of 10')
  })
  it("flags the format's glyphs apart from the value", () => {
    expect(formatNumber(-1234, { number_family: 'currency', number_currency: 'AUD' })).toEqual([
      { text: '-', glyph: false },
      { text: 'A$', glyph: true },
      { text: '1,234.00', glyph: false },
    ])
    expect(formatNumber(30, { number_family: 'percent' })).toEqual([
      { text: '30', glyph: false },
      { text: '%', glyph: true },
    ])
  })
  it('a zero denominator is no fraction', () => {
    expect(
      shown(3, { number_family: 'number', number_fraction: true, number_denominator: 0 }),
    ).toBe('3')
  })
})

describe('fractionDenominator', () => {
  it('is the denominator only with Fraction on, a positive denominator, and a non-Percent format', () => {
    expect(fractionDenominator({ number_fraction: true, number_denominator: 10 })).toBe(10)
    expect(
      fractionDenominator({
        number_family: 'percent',
        number_fraction: true,
        number_denominator: 10,
      }),
    ).toBeUndefined()
    expect(fractionDenominator({ number_fraction: false, number_denominator: 10 })).toBeUndefined()
    expect(fractionDenominator({ number_fraction: true, number_denominator: 0 })).toBeUndefined()
    expect(fractionDenominator({ number_fraction: true, number_denominator: -4 })).toBeUndefined()
    expect(fractionDenominator(undefined)).toBeUndefined()
  })
})

describe('numberFormatGlyph', () => {
  it('is % or the currency symbol a cell shows, and nothing for a plain number', () => {
    expect(numberFormatGlyph({ number_family: 'percent' })).toBe('%')
    expect(numberFormatGlyph({})).toBeUndefined()
    expect(
      CURRENCY_CODES.map((c) =>
        numberFormatGlyph({ number_family: 'currency', number_currency: c }),
      ),
    ).toEqual(['$', '€', '£', 'A$', 'CA$', '¥'])
  })
})

describe('barDivisor', () => {
  it('is 100 for percent, the denominator for fraction, undefined otherwise', () => {
    expect(barDivisor('bar', { number_family: 'percent' })).toBe(100)
    expect(
      barDivisor('bar', { number_family: 'number', number_fraction: true, number_denominator: 10 }),
    ).toBe(10)
    expect(barDivisor('bar', { number_family: 'number', number_fraction: false })).toBeUndefined()
  })
  it('guards a zero / missing denominator', () => {
    expect(
      barDivisor('bar', { number_family: 'number', number_fraction: true, number_denominator: 0 }),
    ).toBeUndefined()
    expect(barDivisor('bar', { number_family: 'number', number_fraction: true })).toBeUndefined()
  })
})

describe('readNumber', () => {
  it('reads a YAML number as itself and a string as the number it spells', () => {
    expect(readNumber(42)).toBe(42)
    expect(readNumber('30')).toBe(30)
    expect(readNumber(' 3.5 ')).toBe(3.5)
    expect(readNumber('1,200')).toBe(1200)
    expect(readNumber('-1,200.50')).toBe(-1200.5)
    expect(readNumber('30%')).toBe(30)
    expect(readNumber('30 %')).toBe(30)
    expect(readNumber('$1,200')).toBe(1200)
    expect(readNumber('-$30')).toBe(-30)
    expect(readNumber('+$5')).toBe(5)
    expect(readNumber('CA$1,300.5')).toBe(1300.5)
    expect(readNumber('5A$')).toBe(5)
    expect(readNumber('30 €')).toBe(30)
    expect(readNumber('£ 7')).toBe(7)
    expect(readNumber('¥500')).toBe(500)
  })

  it('reads nothing from a value that spells no number', () => {
    for (const raw of [
      'five',
      '',
      '$',
      '%',
      '1,5',
      '12,34,567',
      '$30%',
      '-$-30',
      '30 USD',
      true,
      null,
      ['30'],
    ])
      expect(readNumber(raw)).toBeUndefined()
  })
})

describe('spelledNumber', () => {
  it('keeps the file’s spelling of an unchanged value', () => {
    expect(spelledNumber(30, '30.0')).toBe('30.0')
    expect(spelledNumber(1200, '$1,200.00')).toBe('$1,200.00')
  })

  it('a changed value keeps the string shape, symbol, percent sign, spacing, grouping, and decimal places, its digits typed', () => {
    expect(spelledNumber(1300, '$1,200.00')).toBe('$1,300.00')
    expect(spelledNumber(45.125, '30.50%')).toBe('45.125%')
    expect(spelledNumber(2, '1.000000000000000000001')).toBe('2.00000000000000000000')
    expect(spelledNumber(1234567, '1,200')).toBe('1,234,567')
    expect(spelledNumber(1234, '1200')).toBe('1234')
    expect(spelledNumber(45, '30%')).toBe('45%')
    expect(spelledNumber(-40, '$30')).toBe('-$40')
    expect(spelledNumber(31, '30 €')).toBe('31 €')
  })

  it('lands bare over anything but a string spelling a number, and where the spelling would not read back', () => {
    expect(spelledNumber(31, 30)).toBe(31)
    expect(spelledNumber(31, 'five')).toBe(31)
    expect(spelledNumber(1e-25, '$30')).toBe(1e-25)
  })
})
