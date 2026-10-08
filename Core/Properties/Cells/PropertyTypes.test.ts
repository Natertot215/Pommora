import { describe, expect, it } from 'vitest'
import { CREATABLE_TYPES } from './PropertyTypes'

describe('CREATABLE_TYPES', () => {
  it('lists the user types in the New Property order', () => {
    expect(CREATABLE_TYPES).toEqual([
      'text',
      'number',
      'checkbox',
      'dateTime',
      'select',
      'multiSelect',
      'status',
      'link',
      'file',
    ])
  })
})
