import { describe, expect, it } from 'vitest'
import { parsePropertyAction, propertiesRow } from './propertyRows'

const ROWS = [
  {
    id: 'ctx1',
    name: 'Areas',
    options: [{ value: 's1', label: 'Health', checked: true }],
  },
  { id: 'p1', name: 'Select', options: [], separatorBefore: true },
  { id: 'p2', name: 'Link' },
]

describe('propertiesRow', () => {
  it('nests every row under one Properties branch, keeping the divider', () => {
    const row = propertiesRow(ROWS)
    expect(row.label).toBe('Properties')
    expect(row.submenu?.map((i) => [i.label, i.separatorBefore])).toEqual([
      ['Areas', undefined],
      ['Select', true],
      ['Link', undefined],
    ])
  })

  it('an options row carries its picks checked; a bare row stays a leaf', () => {
    const [areas, , link] = propertiesRow(ROWS).submenu ?? []
    expect(areas.submenu).toEqual([{ label: 'Health', action: 'prop:ctx1:s1', checked: true }])
    expect(link.submenu).toBeUndefined()
    expect(link.action).toBe('prop:p2')
  })

  it('a property with no options to offer is disabled rather than an empty branch', () => {
    const select = propertiesRow(ROWS).submenu?.[1]
    expect(select).toMatchObject({ disabled: true })
    expect(select?.submenu).toBeUndefined()
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
