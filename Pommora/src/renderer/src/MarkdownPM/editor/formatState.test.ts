import { describe, it, expect } from 'vitest'
import { readFormatState } from './formatState'

describe('readFormatState', () => {
  it('detects an inline mark wrapping the caret', () => {
    const doc = 'a **bold** b'
    expect(readFormatState(doc, 5, 5, true, false).bold).toBe(true)
    expect(readFormatState(doc, 0, 0, true, false).bold).toBe(false)
  })

  it('reads the caret line heading level', () => {
    expect(readFormatState('## Title', 4, 4, true, false).heading).toBe(2)
    expect(readFormatState('plain', 2, 2, true, false).heading).toBe(0)
  })

  it('reads list kind and blockquote', () => {
    expect(readFormatState('- [ ] task', 7, 7, true, false).list).toBe('checkbox')
    expect(readFormatState('1. item', 4, 4, true, false).list).toBe('ordered')
    expect(readFormatState('> quote', 3, 3, true, false).block).toBe('quote')
  })

  it('a callout is NOT reported as a quote (re-toggling quote would orphan the `[!type]`)', () => {
    expect(readFormatState('> [!callout] hi', 14, 14, true, false).block).toBeNull()
  })

  it('carries focus + selection flags', () => {
    const s = readFormatState('hello', 0, 5, false, false)
    expect(s.focused).toBe(false)
    expect(s.hasSelection).toBe(true)
  })
})
