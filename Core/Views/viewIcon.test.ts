import { describe, expect, it } from 'vitest'
import { iconForTypeSwitch, viewGlyph } from './viewIcon'

describe('iconForTypeSwitch', () => {
  it('re-icons a view that still carries the old default (table → cards)', () => {
    expect(iconForTypeSwitch({ icon: 'table', type: 'table' }, 'cards')).toBe('cards-grid')
    expect(iconForTypeSwitch({ icon: 'cards-grid', type: 'cards' }, 'table')).toBe('table')
  })

  it('treats an absent icon as the default', () => {
    expect(iconForTypeSwitch({ icon: undefined, type: 'table' }, 'cards')).toBe('cards-grid')
  })

  it('keeps a custom icon (returns undefined)', () => {
    expect(iconForTypeSwitch({ icon: 'star', type: 'table' }, 'cards')).toBeUndefined()
  })
})

describe('viewGlyph', () => {
  it('falls back to the kind glyph and keeps a custom icon', () => {
    expect(viewGlyph({ icon: undefined, type: 'cards' })).toBe('cards-grid')
    expect(viewGlyph({ icon: 'star', type: 'cards' })).toBe('star')
  })
})
