import { describe, expect, it } from 'vitest'
import { parsePropertyAction, propertyBranchRows } from './propertyRows'

const ROWS = [
  {
    id: 'ctx1',
    name: 'Areas',
    options: [[{ value: 's1', label: 'Health', checked: true }]],
  },
  { id: 'p1', name: 'Select', options: [] },
  { id: 'p2', name: 'Link' },
]

describe('propertyBranchRows', () => {
  const [properties] = propertyBranchRows({ properties: ROWS })

  it('nests every row under one Properties branch', () => {
    expect(properties.label).toBe('Properties')
    expect(properties.submenu?.map((i) => i.label)).toEqual(['Areas', 'Select', 'Link'])
  })

  it('an options row carries its picks checked; a bare row stays a leaf', () => {
    const [areas, , link] = properties.submenu ?? []
    expect(areas.submenu).toEqual([{ label: 'Health', action: 'prop:ctx1:s1', checked: true }])
    expect(link.submenu).toBeUndefined()
    expect(link.action).toBe('prop:p2')
  })

  it('divides each later run of picks from the one before it', () => {
    const [status] = propertyBranchRows({
      properties: [
        {
          id: 'st',
          name: 'Status',
          options: [
            [{ value: 'Open', label: 'Open', checked: false }],
            [
              { value: 'Active', label: 'Active', checked: true },
              { value: 'Review', label: 'Review', checked: false },
            ],
          ],
        },
      ],
    })
    expect(status.submenu?.[0].submenu?.map((i) => [i.label, i.separatorBefore ?? false])).toEqual([
      ['Open', false],
      ['Active', true],
      ['Review', false],
    ])
  })

  it('labels the Spaces half over the same submenu', () => {
    const [spaces] = propertyBranchRows({ spaces: ROWS })
    expect(spaces.label).toBe('Spaces')
    expect(spaces.submenu).toEqual(properties.submenu)
  })

  it('a property with no options to offer is an empty branch, which both renderers grey out', () => {
    expect(properties.submenu?.[1].submenu).toEqual([])
  })

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
