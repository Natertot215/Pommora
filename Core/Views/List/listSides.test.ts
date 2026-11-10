import { describe, expect, it } from 'vitest'
import { FILEDATA, type PropertyDefinition, type ResolvedColumn } from '../../Properties/properties'
import { contextColumn, propertyColumn, resolveColumn, resolveColumns } from '../Pipeline/columns'
import type { SavedView } from '../views'
import { sideColumn, sideDrop, sideFor } from './listSides'

const def = (id: string, type: PropertyDefinition['type']): PropertyDefinition => ({
  id,
  label: id,
  key: id,
  type,
})

const schema: PropertyDefinition[] = [
  def('s_sel', 'select'),
  def('s_ms', 'multiSelect'),
  def('s_st', 'status'),
  def('s_cb', 'checkbox'),
  def('s_ln', 'link'),
  def('s_tx', 'text'),
  def('s_fl', 'file'),
  def('s_nm', 'number'),
  def('s_dt', 'dateTime'),
  def('s_hid', 'number'),
]

const view = (over: Partial<SavedView> = {}): SavedView => ({
  id: 'view_l',
  name: 'List',
  type: 'list',
  property_order: ['_title', 's_sel', 's_dt', 's_hid', 's_nm', 's_cb'],
  hidden_properties: ['s_hid'],
  ...over,
})

const column = (id: string): ResolvedColumn => resolveColumn(id, schema, ['ctx_a'])!

describe('sideFor', () => {
  it.each([
    ['Title', FILEDATA.title.id, 'left'],
    ['a Context', 'ctx_a', 'left'],
    ['a Status', 's_st', 'left'],
    ['a Select', 's_sel', 'left'],
    ['a Multi-Select', 's_ms', 'left'],
    ['a Checkbox', 's_cb', 'right'],
    ['a Link', 's_ln', 'right'],
    ['a Text', 's_tx', 'right'],
    ['a File', 's_fl', 'right'],
    ['a Number', 's_nm', 'right'],
    ['a Date', 's_dt', 'right'],
    ['Creation Time', FILEDATA.createdAt.id, 'right'],
    ['Last Modified', FILEDATA.modifiedAt.id, 'right'],
  ])('%s defaults to its type’s side', (_, id, side) => {
    expect(sideFor(column(id), view())).toBe(side)
  })

  it('reads a stored side over the default', () => {
    const v = view({ column_sides: { s_sel: 'right', s_dt: 'left' } })
    expect(sideFor(propertyColumn(schema[0]), v)).toBe('right')
    expect(sideFor(column('s_dt'), v)).toBe('left')
    expect(sideFor(contextColumn('ctx_a'), v)).toBe('left')
  })
})

describe('sideColumn', () => {
  const shown = resolveColumns(view(), schema, [])

  it('lists Left in stored order', () => {
    expect(sideColumn(shown, view(), 'left').map((c) => c.id)).toEqual(['_title', 's_sel'])
  })

  it('lists Right from the row’s edge inward, its stored order reversed', () => {
    expect(sideColumn(shown, view(), 'right').map((c) => c.id)).toEqual(['s_cb', 's_nm', 's_dt'])
  })
})

describe('sideDrop', () => {
  const shown = resolveColumns(view(), schema, [])

  it('at Right’s top writes the id last in property_order, with no side', () => {
    expect(sideDrop(view(), shown, 'right', 's_dt', 's_cb')).toEqual({
      property_order: ['_title', 's_sel', 's_hid', 's_nm', 's_cb', 's_dt'],
      hidden_properties: ['s_hid'],
    })
  })

  it('between two Right rows writes it just before the row drawn above it, after the row drawn below', () => {
    expect(sideDrop(view(), shown, 'right', 's_cb', 's_dt').property_order).toEqual([
      '_title',
      's_sel',
      's_dt',
      's_hid',
      's_cb',
      's_nm',
    ])
  })

  it('at Left’s end writes it last, with no side', () => {
    expect(sideDrop(view(), shown, 'left', 's_sel', null)).toEqual({
      property_order: ['_title', 's_dt', 's_hid', 's_nm', 's_cb', 's_sel'],
      hidden_properties: ['s_hid'],
    })
  })

  it('across sides writes its side in the same patch', () => {
    expect(sideDrop(view(), shown, 'right', 's_sel', 's_dt')).toEqual({
      property_order: ['_title', 's_dt', 's_hid', 's_sel', 's_nm', 's_cb'],
      hidden_properties: ['s_hid'],
      column_sides: { s_sel: 'right' },
    })
  })

  it('leaves a hidden id where it stands', () => {
    const order = sideDrop(view(), shown, 'left', 's_nm', 's_sel').property_order!
    expect(order).toEqual(['_title', 's_nm', 's_sel', 's_dt', 's_hid', 's_cb'])
    expect(order.indexOf('s_hid')).toBe(order.indexOf('s_dt') + 1)
  })
})
