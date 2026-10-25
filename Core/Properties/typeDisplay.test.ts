import { describe, expect, it } from 'vitest'
import { chipOf, propertyTypeLabel } from './typeDisplay'

describe('chipOf', () => {
  it("draws a Status option as a pill, a Select or Multi-Select option as a tag, and a Context option as a Select's", () => {
    expect(chipOf('status')).toEqual({ shape: 'pill', glyph: 'circle-dashed' })
    expect(chipOf('select')).toEqual({ shape: 'tag', glyph: 'tag' })
    expect(chipOf('multiSelect')).toEqual({ shape: 'tag', glyph: 'tags' })
    expect(chipOf('context')).toEqual(chipOf('select'))
  })
})

describe('propertyTypeLabel', () => {
  it('names the Date & Time type in full', () => {
    expect(propertyTypeLabel('dateTime')).toBe('Date & Time')
  })
})
