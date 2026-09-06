import { describe, it, expect } from 'vitest'
import { EDITOR_BASE_PT, zoomFontSize } from './MarkdownEditor'

describe('the editor font size is the 15pt base times the scale', () => {
  it('1 is the base', () => {
    expect(zoomFontSize(1)).toBe(EDITOR_BASE_PT)
  })
  it('the scale steps land as plain multiples', () => {
    expect(zoomFontSize(0.5)).toBe(7.5)
    expect(zoomFontSize(1.5)).toBe(22.5)
  })
  it('a scale past the steps clamps to their ends', () => {
    expect(zoomFontSize(0.1)).toBe(7.5)
    expect(zoomFontSize(3)).toBe(22.5)
  })
})
