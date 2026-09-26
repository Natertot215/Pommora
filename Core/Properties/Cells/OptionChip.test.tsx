import { describe, expect, it } from 'vitest'
import { optionGlyph } from './OptionChip'

describe('optionGlyph', () => {
  it('draws a Multi-Select option as tags and a Select option as a tag when the option has no icon', () => {
    expect(optionGlyph('multi_select', { value: 'a' })).toBe('tags')
    expect(optionGlyph('select', { value: 'a' })).toBe('tag')
  })
})
