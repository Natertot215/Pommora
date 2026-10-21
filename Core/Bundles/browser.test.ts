import { describe, expect, it } from 'vitest'
import { filterRows, widestDate } from './browser'
import { bundleRow as row } from '../Testing/fixtures'

describe('filterRows', () => {
  const rows = [
    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
    row({ title: 'Gamma', crumbs: [] }),
  ]

  it('an empty query keeps the list whole and in the order it arrived', () => {
    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(filterRows(rows, '   ')).toBe(rows)
  })

  it('matches a title', () => {
    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location, so a row is findable by where it lived', () => {
    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location and a title together, a / reading as a word break', () => {
    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
  })

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })

  it('narrows in place, keeping the order it arrived in rather than ranking the best match first', () => {
    const listed = [
      row({ title: 'Notes Archive', crumbs: [] }),
      row({ title: 'Notes', crumbs: [] }),
    ]
    expect(filterRows(listed, 'notes').map((r) => r.title)).toEqual(['Notes Archive', 'Notes'])
  })
})

describe('widestDate', () => {
  it('a style showing the weekday and the time runs September’s Wednesday the 30th at 12:00 PM', () => {
    const sample = widestDate({ date_format: 'full', time_format: 'twelveHour', weekday: 'long' })
    for (const part of ['Wednesday', 'September', '30th', '12:00 PM'])
      expect(sample).toContain(part)
  })

  it('a style without them leaves the weekday and the time out', () => {
    const sample = widestDate({ date_format: 'full', time_format: 'none', weekday: 'none' })
    expect(sample).toContain('September 30th')
    for (const part of ['Wednesday', '12:00']) expect(sample).not.toContain(part)
  })

  it('a relative style runs a week ago with its clock, else a year’s last month', () => {
    expect(
      widestDate({ date_format: 'relative', time_format: 'twelveHour', weekday: 'none' }),
    ).toBe('7 Days Ago at 12:00 PM')
    expect(widestDate({ date_format: 'relative', time_format: 'none', weekday: 'none' })).toBe(
      '12 Months Ago',
    )
  })
})
