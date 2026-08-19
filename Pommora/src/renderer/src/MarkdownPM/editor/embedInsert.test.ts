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

  it('the Embed ▸ Webpage pair seats the caret between the parens', () => {
    const doc = 'para\nnext'
    const c = embedInsertAfter(doc, 4, '![]()')
    const next = doc.slice(0, c.from) + c.insert + doc.slice(c.to)
    expect(next).toBe('para\n\n![]()\n\nnext')
    // The caret seat is one back from the helper's end-of-token — inside the `()`.
    expect(next[c.caret - 1]).toBe(')')
    expect(next[c.caret - 2]).toBe('(')
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
