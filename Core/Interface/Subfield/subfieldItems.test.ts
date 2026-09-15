import { describe, expect, it } from 'vitest'
import { DEFAULT_ITEMS } from './subfieldItems'

describe('subfield item registry', () => {
  it('NavView (the none kind) counts what its list is showing', () => {
    expect(DEFAULT_ITEMS.none).toEqual(['count'])
  })

  it('a container states its result count', () => {
    expect(DEFAULT_ITEMS.collection).toEqual(['count'])
    expect(DEFAULT_ITEMS.set).toEqual(['count'])
  })
})
