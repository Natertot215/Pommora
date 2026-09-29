import { describe, it, expect } from 'vitest'
import { findOption } from './cellResolve'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_tag',
    name: 'Tag',
    type: 'select',
    select_options: [{ value: 'opt_a', color: 'green' }],
  },
]

describe('findOption', () => {
  it('returns the option with its color (the chip tint)', () => {
    expect(findOption(schema[0], 'opt_a')).toEqual({ value: 'opt_a', color: 'green' })
  })
  it('returns undefined for an unknown value', () => {
    expect(findOption(schema[0], 'nope')).toBeUndefined()
  })
})
