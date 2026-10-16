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

describe('the paint a right-click reads', () => {
  it('names a highlight’s color, the accent for a bare one, and none outside', () => {
    const doc = 'a ==🔴warm== ==plain== b'
    const painted = (at: number) => readFormatState(scanDoc(doc), at, at).painted
    expect(painted(6)).toEqual({ paint: 'highlight', color: 'red' })
    expect(painted(4)).toEqual({ paint: 'highlight', color: 'red' })
    expect(painted(10)).toEqual({ paint: 'highlight', color: 'red' })
    expect(painted(16)).toEqual({ paint: 'highlight', color: 'accent' })
    expect(painted(0)).toBeNull()
  })

  it('names a text color’s, from its mark through its words', () => {
    const doc = 'a =🔴warm= b'
    expect(readFormatState(scanDoc(doc), 3, 3).painted).toEqual({
      paint: 'textColor',
      color: 'red',
    })
    expect(readFormatState(scanDoc(doc), 5, 9).painted).toEqual({
      paint: 'textColor',
      color: 'red',
    })
  })
})

describe('the marks a whole selected span reads', () => {
  it('reads the mark a selection over its markers covers', () => {
    expect(readFormatState(scanDoc('**hi**'), 0, 6).bold).toBe(true)
    expect(readFormatState(scanDoc('==🔴hi=='), 0, 8).painted).toEqual({
      paint: 'highlight',
      color: 'red',
    })
  })

  it('reads a link inside a selected mark as the mark alone', () => {
    const state = readFormatState(scanDoc('**[a](b)**'), 0, 10)
    expect(state.bold).toBe(true)
    expect(state.link).toBe(false)
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
