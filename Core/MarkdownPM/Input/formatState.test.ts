import { describe, it, expect } from 'vitest'
import { readFormatState } from './formatState'
import { scanDoc } from '../Engine/docScan'

describe('readFormatState', () => {
  it('detects an inline mark wrapping the caret', () => {
    const doc = 'a **bold** b'
    expect(readFormatState(scanDoc(doc), 5, 5).bold).toBe(true)
    expect(readFormatState(scanDoc(doc), 0, 0).bold).toBe(false)
  })

  it('reads the caret line heading level', () => {
    expect(readFormatState(scanDoc('## Title'), 4, 4).heading).toBe(2)
    expect(readFormatState(scanDoc('plain'), 2, 2).heading).toBe(0)
  })

  it('reads list kind and blockquote', () => {
    expect(readFormatState(scanDoc('- [ ] task'), 7, 7).list).toBe('checkbox')
    expect(readFormatState(scanDoc('1. item'), 4, 4).list).toBe('ordered')
    expect(readFormatState(scanDoc('> quote'), 3, 3).block).toBe('quote')
  })

  it('a callout is NOT reported as a quote (re-toggling quote would orphan the `[!type]`)', () => {
    expect(readFormatState(scanDoc('> [!callout] hi'), 14, 14).block).toBeNull()
  })
})

describe('the highlight a right-click reads', () => {
  it('names the color, the accent for a bare one, and none outside', () => {
    const doc = 'a ==🔴warm🔴== ==plain== b'
    expect(readFormatState(scanDoc(doc), 6, 6).highlight).toBe('red')
    expect(readFormatState(scanDoc(doc), 4, 4).highlight).toBe('red')
    expect(readFormatState(scanDoc(doc), 12, 12).highlight).toBe('red')
    expect(readFormatState(scanDoc(doc), 18, 18).highlight).toBe('accent')
    expect(readFormatState(scanDoc(doc), 0, 0).highlight).toBeNull()
  })
})

describe('the formats a line inside code reports', () => {
  it('a fenced line reports no connection', () => {
    expect(readFormatState(scanDoc('```\n[[A]]\n```'), 4, 4).connection).toBe(false)
  })

  it('a connection inside inline code reports none', () => {
    expect(readFormatState(scanDoc('x `[[A]]` y'), 4, 4).connection).toBe(false)
  })
})
