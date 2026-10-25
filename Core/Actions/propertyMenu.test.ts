import { describe, expect, it } from 'vitest'
import { propertyMenuModel } from './propertyMenu'

describe('propertyMenuModel', () => {
  it('editor ⋮ yields Remove then a destructive Delete', () => {
    expect(propertyMenuModel({ kind: 'editor' })).toEqual([
      { label: 'Remove', action: 'property:remove' },
      { label: 'Delete', action: 'property:destroy', separatorBefore: true },
    ])
  })

  it('an assigned row yields Rename · Remove', () => {
    expect(propertyMenuModel({ kind: 'assigned-row' }).map((i) => i.action)).toEqual([
      'property:rename',
      'property:remove',
    ])
  })
})
