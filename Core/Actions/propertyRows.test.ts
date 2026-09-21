import { describe, expect, it } from 'vitest'
import { parsePropertyAction, propertiesRow, propertyBranchRows } from './propertyRows'

const ROWS = [
  {
    id: 'ctx1',
    name: 'Areas',
    options: [{ value: 's1', label: 'Health', checked: true }],
  },
  { id: 'p1', name: 'Select', options: [] },
  { id: 'p2', name: 'Link' },
]

describe('propertiesRow', () => {
  it('nests every row under one Properties branch', () => {
    const row = propertiesRow(ROWS)
    expect(row.label).toBe('Properties')
    expect(row.submenu?.map((i) => i.label)).toEqual(['Areas', 'Select', 'Link'])
  })

  it('an options row carries its picks checked; a bare row stays a leaf', () => {
    const [areas, , link] = propertiesRow(ROWS).submenu ?? []
    expect(areas.submenu).toEqual([{ label: 'Health', action: 'prop:ctx1:s1', checked: true }])
    expect(link.submenu).toBeUndefined()
    expect(link.action).toBe('prop:p2')
  })

  it('takes a label for the Spaces half, over the same submenu', () => {
    const row = propertiesRow(ROWS, 'Spaces')
    expect(row.label).toBe('Spaces')
    expect(row.submenu).toEqual(propertiesRow(ROWS).submenu)
  })

  it('a property with no options to offer is disabled rather than an empty branch', () => {
    const select = propertiesRow(ROWS).submenu?.[1]
    expect(select).toMatchObject({ disabled: true })
    expect(select?.submenu).toBeUndefined()
  })
})

describe('propertyBranchRows', () => {
  it('draws Spaces then Properties, and leaves out an empty half', () => {
    const labels = (t: Parameters<typeof propertyBranchRows>[0]): string[] =>
      propertyBranchRows(t).map((i) => i.label)
    expect(labels({ spaces: ROWS, properties: ROWS })).toEqual(['Spaces', 'Properties'])
    expect(labels({ spaces: [], properties: ROWS })).toEqual(['Properties'])
    expect(labels({ spaces: ROWS })).toEqual(['Spaces'])
    expect(labels({})).toEqual([])
  })
})

describe('parsePropertyAction', () => {
  it('reads a leaf as a null value and keeps colons inside an option', () => {
    expect(parsePropertyAction('prop:p2')).toEqual({ id: 'p2', value: null })
    expect(parsePropertyAction('prop:p1:a:b')).toEqual({ id: 'p1', value: 'a:b' })
    expect(parsePropertyAction('prop:p1:')).toEqual({ id: 'p1', value: '' })
  })

  it('passes on anything that is not a property pick', () => {
    expect(parsePropertyAction('title:rename')).toBeNull()
  })
})
