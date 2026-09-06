import { describe, expect, it } from 'vitest'
import { DEFAULT_ITEMS } from './subfieldItems'

describe('subfield item registry', () => {
  it('NavView (the none kind) defaults to the viewType toggle', () => {
    expect(DEFAULT_ITEMS.none).toEqual(['viewType'])
  })
})
