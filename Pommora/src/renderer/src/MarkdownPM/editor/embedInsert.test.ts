import { describe, expect, it } from 'vitest'
import { embedInsertAfter } from './embedInsert'
import { autocompleteQuery } from '../autocomplete'

describe('embedInsertAfter', () => {
  it('fences below a block with content following', () => {
    const doc = 'para\nnext'
    const c = embedInsertAfter(doc, 4, '![[T]]')
    expect(doc.slice(0, c.from) + c.insert + doc.slice(c.to)).toBe('para\n\n![[T]]\n\nnext')
  })

  it('adds no trailing blank when one already follows', () => {
    const doc = 'para\n\nnext'
    const c = embedInsertAfter(doc, 4, '![[T]]')
    expect(doc.slice(0, c.from) + c.insert + doc.slice(c.to)).toBe('para\n\n![[T]]\n\nnext')
  })

  it('lands clean at EOF', () => {
    const doc = 'para'
    const c = embedInsertAfter(doc, 4, '![[T]]')
    expect(doc.slice(0, c.from) + c.insert + doc.slice(c.to)).toBe('para\n\n![[T]]')
  })

  it('the Embed ▸ Internal Page pair hands off to the embed autocomplete', () => {
    const doc = 'para\nnext'
    const c = embedInsertAfter(doc, 4, '![[]]')
    const next = doc.slice(0, c.from) + c.insert + doc.slice(c.to)
    expect(next).toBe('para\n\n![[]]\n\nnext')
    const q = autocompleteQuery(next, c.caret - 2, true)
    expect(q).toMatchObject({ form: 'embed', query: '' })
    expect(next.slice(q?.from, q?.to)).toBe('![[]]')
  })
})
