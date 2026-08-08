import { describe, it, expect, vi } from 'vitest'
import { Text } from '@codemirror/state'
import { docSpanTokens } from './docCache'
import { tokenize } from '../tokens'

describe('docSpanTokens — the parse answers to the doc version and the span set, nothing else', () => {
  const body = 'Intro **bold** `code` [[Link]]'

  it('re-reads the same version and span set instead of parsing again', () => {
    const doc = Text.of([body])
    const derive = vi.fn(() => tokenize(body))
    const first = docSpanTokens(doc, '0:30', derive)
    const second = docSpanTokens(doc, '0:30', derive)
    expect(derive).toHaveBeenCalledTimes(1) // a caret move must not pay the mdast parse
    expect(second).toBe(first)
    expect(first).toEqual(tokenize(body))
  })

  it('re-derives when the span set moves', () => {
    const doc = Text.of([body])
    const derive = vi.fn(() => tokenize(body))
    docSpanTokens(doc, '0:30', derive)
    docSpanTokens(doc, '31:60', derive)
    expect(derive).toHaveBeenCalledTimes(2)
  })

  it('never serves one version’s tokens to another holding the same text', () => {
    const derive = vi.fn(() => tokenize(body))
    docSpanTokens(Text.of([body]), '0:30', derive)
    docSpanTokens(Text.of([body]), '0:30', derive)
    expect(derive).toHaveBeenCalledTimes(2)
  })
})
