import { describe, expect, it } from 'vitest'
import { styleFor } from './columnStyles'
import type { PropertyDefinition } from '@shared/properties'
import { savedView, type SavedView } from '@shared/views'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', name: 'Status', type: 'status' },
  { id: 'prop_date', name: 'Due', type: 'datetime' },
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
    expect(styleFor('prop_status', schema, view({}))).toEqual({ look: 'pill' })
    expect(styleFor('prop_date', schema, view({}))).toEqual({
      date_format: 'full',
      time_format: 'none',
      weekday: 'none',
    })
    expect(styleFor('prop_n', schema, view({}))).toEqual({ look: 'number' })
  })

  it('merges a saved column_styles entry per-key over the defaults', () => {
    const v = view({ column_styles: { prop_date: { time_format: 'twelveHour' } } })
    expect(styleFor('prop_date', schema, v)).toEqual({
      date_format: 'full',
      time_format: 'twelveHour',
      weekday: 'none',
    })
  })

  it('honors a saved look over the default', () => {
    const v = view({ column_styles: { prop_status: { look: 'capsule' } } })
    expect(styleFor('prop_status', schema, v)).toEqual({ look: 'capsule' })
  })

  it('falls back to empty defaults for an unknown column', () => {
    expect(styleFor('prop_gone', schema, view({}))).toEqual({})
  })

  it('a caught-invalid saved value falls back to the default instead of erasing it', () => {
    const v = view({ column_styles: { prop_status: { look: 'zebra' } } } as never)
    expect(styleFor('prop_status', schema, v)).toEqual({ look: 'pill' })
  })

  it("takes the nexus's date form where the column set none", () => {
    expect(styleFor('prop_date', schema, view({}), 'relative')).toEqual({
      date_format: 'relative',
      time_format: 'none',
      weekday: 'none',
    })
  })

  it("a column's own date form outranks the nexus's", () => {
    const v = view({ column_styles: { prop_date: { date_format: 'short' } } })
    expect(styleFor('prop_date', schema, v, 'relative').date_format).toBe('short')
  })

  it('an absent nexus form reads as it always has', () => {
    expect(styleFor('prop_date', schema, view({}), undefined).date_format).toBe('full')
  })

  it('reaches Modified columns, which share the datetime arm', () => {
    const withModified: PropertyDefinition[] = [
      ...schema,
      { id: 'prop_m', name: 'Modified', type: 'last_edited_time' },
    ]
    expect(styleFor('prop_m', withModified, view({}), 'dayMonthYear').date_format).toBe(
      'dayMonthYear',
    )
  })
})
