import { describe, expect, it } from 'vitest'
import {
  columnMenuItems,
  styleMenuLabel,
  parseStyleAction,
  styleMenuItems,
  type StyleMenuContext,
} from './columnMenu'

const items = (
  type: StyleMenuContext['type'],
  current: StyleMenuContext['current'] = {},
  barCapable = false,
) => styleMenuItems({ type, current, barCapable })

describe('styleMenuItems', () => {
  it('status offers Standard and Compact, current checked', () => {
    const rows = items('status', { look: 'compact' })
    expect(rows.map((r) => [r.label, r.action])).toEqual([
      ['Standard', 'style:look:standard'],
      ['Compact', 'style:look:compact'],
    ])
    expect(rows.find((r) => r.action === 'style:look:compact')?.checked).toBe(true)
  })

  it('select and multi-select offer Standard and Compact', () => {
    expect(items('select', { look: 'standard' }).map((r) => r.action)).toEqual([
      'style:look:standard',
      'style:look:compact',
    ])
    expect(items('multi_select', {}).map((r) => r.action)).toEqual([
      'style:look:standard',
      'style:look:compact',
    ])
  })

  it('checkbox offers Checkbox/Switch; url the three link forms; file Filename/Full Path', () => {
    expect(items('checkbox', { look: 'checkbox' }).map((r) => r.label)).toEqual([
      'Checkbox',
      'Switch',
    ])
    expect(items('url', { look: 'link-full' }).map((r) => r.label)).toEqual([
      'Full Link',
      'Short Link',
      'Page Title',
    ])
    expect(items('file', {})).toEqual([])
  })

  it('number offers Bar only when bar-capable; plain numbers get Number alone', () => {
    const rows = items('number', { look: 'bar' }, true)
    expect(rows.map((r) => [r.label, r.action, r.checked])).toEqual([
      ['Number', 'style:look:number', false],
      ['Bar', 'style:look:bar', true],
    ])
    expect(items('number', { look: 'number' }).map((r) => r.label)).toEqual(['Number'])
  })

  it('datetime lists dates, then weekdays, then times — each group behind a separator', () => {
    const rows = items('datetime', { date_format: 'full', time_format: 'none', weekday: 'none' })
    expect(rows.map((r) => [r.label, r.action])).toEqual([
      ['MM/DD/YYYY', 'style:date_format:monthDayYear'],
      ['DD/MM/YYYY', 'style:date_format:dayMonthYear'],
      ['Short Date', 'style:date_format:short'],
      ['Full Date', 'style:date_format:full'],
      ['Relative', 'style:date_format:relative'],
      ['Full', 'style:weekday:long'],
      ['Short', 'style:weekday:short'],
      ['Hidden', 'style:weekday:none'],
      ['12 Hours', 'style:time_format:twelveHour'],
      ['24 Hours', 'style:time_format:twentyFourHour'],
      ['Hidden', 'style:time_format:none'],
    ])
    expect(rows.find((r) => r.action === 'style:weekday:long')?.separatorBefore).toBe(true)
    expect(rows.find((r) => r.action === 'style:time_format:twelveHour')?.separatorBefore).toBe(
      true,
    )
    expect(rows.filter((r) => r.checked).map((r) => r.action)).toEqual([
      'style:date_format:full',
      'style:weekday:none',
      'style:time_format:none',
    ])
  })

  it('offers the Relative date radio and Full/Short/Hidden weekday radios', () => {
    const rows = items('datetime', { date_format: 'full', time_format: 'none', weekday: 'none' })
    expect(rows.find((r) => r.action === 'style:date_format:relative')?.label).toBe('Relative')
    expect(
      rows.filter((r) => r.action.startsWith('style:weekday:')).map((r) => [r.label, r.action]),
    ).toEqual([
      ['Full', 'style:weekday:long'],
      ['Short', 'style:weekday:short'],
      ['Hidden', 'style:weekday:none'],
    ])
  })

  it('last_edited_time shares the datetime menu', () => {
    expect(items('last_edited_time', {}).map((r) => r.label)).toContain('Short Date')
  })

  it('context gets no Style items', () => {
    expect(items('context')).toEqual([])
  })
})

describe('columnMenuItems', () => {
  it('offers Align and Style drills where the column takes them, the Icon check, and a divided Hide', () => {
    const items = columnMenuItems({
      align: 'center',
      alignable: true,
      hideable: true,
      iconsShown: true,
      style: { type: 'status', current: { look: 'compact' } },
    })
    expect(items.map((i) => [i.label, i.separatorBefore ?? false])).toEqual([
      ['Align', false],
      ['Style', false],
      ['Icon', false],
      ['Hide', true],
    ])
    expect(items[0].submenu?.find((r) => r.checked)?.action).toBe('align:center')
    expect(items[1].submenu?.find((r) => r.checked)?.action).toBe('style:look:compact')
    expect(items[2]).toMatchObject({ action: 'column:toggle-icons', checked: true })
  })

  it('a title column offers the Icon check alone', () => {
    expect(
      columnMenuItems({ align: 'left', alignable: false, hideable: false, iconsShown: false }).map(
        (i) => i.action,
      ),
    ).toEqual(['column:toggle-icons'])
  })
})

describe('parseStyleAction', () => {
  it('round-trips a style action string', () => {
    expect(parseStyleAction('style:look:compact')).toEqual({ key: 'look', value: 'compact' })
    expect(parseStyleAction('style:date_format:monthDayYear')).toEqual({
      key: 'date_format',
      value: 'monthDayYear',
    })
  })

  it('accepts a weekday action', () => {
    expect(parseStyleAction('style:weekday:long')).toEqual({ key: 'weekday', value: 'long' })
  })

  it('rejects non-style or malformed actions', () => {
    expect(parseStyleAction('align:left')).toBeNull()
    expect(parseStyleAction('style:bogus_key:x')).toBeNull()
  })
})

describe('styleMenuLabel', () => {
  it('says Format for the two whose rows are one', () => {
    expect(styleMenuLabel('url')).toBe('Format')
    expect(styleMenuLabel('number')).toBe('Format')
  })
  it('leaves the rest as Style', () => {
    for (const t of ['status', 'checkbox', 'file', 'datetime', 'last_edited_time'] as const)
      expect(styleMenuLabel(t)).toBe('Style')
  })
})
