import { describe, expect, it } from 'vitest'
import { scanOf } from '../Engine/docScan'
import { blockQueryAt } from './blockQuery'

const at = (text: string, caret = text.length) => blockQueryAt(scanOf(text), caret)

describe('the block menu opens on a line holding nothing but the slash', () => {
  it('takes a bare slash with the caret behind it', () => {
    expect(at('/')).toEqual({ query: '', from: 0, to: 1 })
  })

  it('carries what follows the slash as the query', () => {
    expect(at('/hea')).toEqual({ query: 'hea', from: 0, to: 4 })
  })

  it('reads the caret line, not the document, when more lines follow', () => {
    expect(at('/\nsecond', 1)).toEqual({ query: '', from: 0, to: 1 })
  })
})

describe('the block menu refuses a line the slash does not own', () => {
  it('refuses a query holding a space', () => {
    expect(at('/he a')).toBeNull()
  })

  it('refuses a slash with text before it', () => {
    expect(at('a/')).toBeNull()
  })

  it('refuses an indented slash', () => {
    expect(at(' /')).toBeNull()
  })

  it('refuses a slash behind a quote marker', () => {
    expect(at('> /')).toBeNull()
  })

  it('refuses a slash behind a list marker', () => {
    expect(at('- /')).toBeNull()
  })

  it('refuses a caret resting short of the line end', () => {
    expect(at('/hea', 2)).toBeNull()
  })
})

describe('the block menu refuses the constructs a lone-line insert refuses', () => {
  it('refuses a line inside a closed fence', () => {
    expect(at('```\n/\n```', 5)).toBeNull()
  })

  it('refuses a line inside a fence still being opened', () => {
    expect(at('```\n/')).toBeNull()
  })

  it('refuses a line inside a math block', () => {
    expect(at('$$\n/\n$$', 4)).toBeNull()
  })

  it('refuses a line inside the citations run', () => {
    expect(at('body\n\n[^1]: note\n/')).toBeNull()
  })
})
