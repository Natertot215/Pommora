import { describe, expect, it } from 'vitest'
import { pickedStyle, styleFor } from './useColumnStyles'
import { dateDefaults } from '@pommora/core/Properties/columnStyles'
import type { DateFormat } from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { savedView, type SavedView } from '@pommora/core/Views/views'

const nexus = (dateFormat: DateFormat) => ({
  dateFormat,
  clock: 'twentyFourHour' as const,
})

const DATES = dateDefaults('full')

const schema: PropertyDefinition[] = [
  { id: 'prop_status', name: 'Status', type: 'status' },
  { id: 'prop_date', name: 'Due', type: 'dateTime' },
  { id: 'prop_n', name: 'Count', type: 'number' },
]

function view(over: Partial<SavedView>): SavedView {
  return savedView.parse({
    id: 'view_x',
    name: 'V',
    type: 'table',
    property_order: [],
    hidden_properties: [],
    ...over,
  })
}

describe('styleFor', () => {
  it('returns the type defaults with no view entry', () => {
    expect(styleFor('prop_status', schema, view({}), nexus('full'))).toEqual({
      ...DATES,
      look: 'standard',
    })
    expect(styleFor('prop_date', schema, view({}), nexus('full'))).toEqual({
      date_format: 'full',
      time_format: 'none',
      weekday: 'none',
    })
    expect(styleFor('prop_n', schema, view({}), nexus('full'))).toEqual({
      ...DATES,
      look: 'number',
    })
  })

  it('merges a saved column_styles entry per-key over the defaults', () => {
    const v = view({ column_styles: { prop_date: { time_format: 'twelveHour' } } })
    expect(styleFor('prop_date', schema, v, nexus('full'))).toEqual({
      date_format: 'full',
      time_format: 'twelveHour',
      weekday: 'none',
    })
  })

  it('honors a saved look over the default', () => {
    const v = view({ column_styles: { prop_status: { look: 'compact' } } })
    expect(styleFor('prop_status', schema, v, nexus('full'))).toEqual({ ...DATES, look: 'compact' })
  })

  it('falls back to empty defaults for an unknown column', () => {
    expect(styleFor('prop_gone', schema, view({}), nexus('full'))).toEqual(DATES)
  })

  it('a caught-invalid saved value falls back to the default instead of erasing it', () => {
    const v = view({ column_styles: { prop_status: { look: 'zebra' } } } as never)
    expect(styleFor('prop_status', schema, v, nexus('full'))).toEqual({
      ...DATES,
      look: 'standard',
    })
  })

  it("takes the nexus's date form where the column set none", () => {
    expect(styleFor('prop_date', schema, view({}), nexus('relative'))).toEqual({
      date_format: 'relative',
      time_format: 'none',
      weekday: 'none',
    })
  })

  it("a column's own date form outranks the nexus's", () => {
    const v = view({ column_styles: { prop_date: { date_format: 'short' } } })
    expect(styleFor('prop_date', schema, v, nexus('relative')).date_format).toBe('short')
  })

  it('reaches Modified columns, which share the dateTime arm', () => {
    const withModified: PropertyDefinition[] = [
      ...schema,
      { id: 'prop_m', name: 'Modified', type: 'lastEditedTime' },
    ]
    expect(styleFor('prop_m', withModified, view({}), nexus('dayMonthYear')).date_format).toBe(
      'dayMonthYear',
    )
  })
})

describe('a column follows the Nexus until it picks its own', () => {
  it('shows a time on the Nexus clock and keeps following it', () => {
    const v = view({ column_styles: { prop_date: { time_format: 'shown' } } })
    expect(styleFor('prop_date', schema, v, nexus('relative')).time_format).toBe('twentyFourHour')
  })

  it("stores nothing for the Nexus's own date form, and 'shown' for its clock", () => {
    const pick = (key: 'date_format' | 'time_format', value: string) =>
      pickedStyle('prop_date', schema, nexus('relative'), key, value)
    expect(pick('date_format', 'relative')).toBeUndefined()
    expect(pick('date_format', 'full')).toBe('full')
    expect(pick('time_format', 'twentyFourHour')).toBe('shown')
    expect(pick('time_format', 'twelveHour')).toBe('twelveHour')
    expect(pick('time_format', 'none')).toBeUndefined()
  })
})
