import { describe, it, expect } from 'vitest'
import { autocompleteQuery, connectionInsert } from './autocomplete'

describe('autocompleteQuery', () => {
  it('detects a non-empty query with the caret inside the brackets', () => {
    const doc = 'see [[Pro]] end'
    const r = autocompleteQuery(doc, 9)! // caret after "Pro"
    expect(r.query).toBe('Pro')
    expect(doc.slice(r.from, r.to)).toBe('[[Pro]]')
  })
  it('suppresses on an empty placeholder', () => {
    expect(autocompleteQuery('see [[]] end', 6)).toBeNull()
  })
  it('suppresses image embeds ![[…]]', () => {
    expect(autocompleteQuery('see ![[Pic]] end', 9)).toBeNull()
  })
  it('returns null when the caret is outside any wikilink', () => {
    expect(autocompleteQuery('plain text', 5)).toBeNull()
    expect(autocompleteQuery('[[Pro]] x', 9)).toBeNull() // caret past the closer
  })
})

describe('connectionInsert', () => {
  it('builds [[Title]] and the caret after the closer', () => {
    const { insert, caret } = connectionInsert('Page A', 4)
    expect(insert).toBe('[[Page A]]')
    expect(caret).toBe(4 + '[[Page A]]'.length)
  })
})
// The embed branch is opt-in (allowEmbeds) and local — table cells never pass the flag, so `![[`
// can never complete there; the connections pattern itself is untouched.
describe('embed autocomplete detection', () => {
  it('an unclosed ![[ query resolves with the span to line end', () => {
    expect(autocompleteQuery('x ![[Fo', 7, true)).toEqual({
      query: 'Fo',
      from: 2,
      to: 7,
      form: 'embed',
    })
  })

  it('a closed ![[..]] span covers the closer', () => {
    expect(autocompleteQuery('![[Fo]]', 5, true)).toEqual({
      query: 'Fo',
      from: 0,
      to: 7,
      form: 'embed',
    })
  })

  it('without the flag, ![[ stays silent — the cell behavior', () => {
    expect(autocompleteQuery('x ![[Fo', 7)).toBeNull()
  })

  it('a plain [[ query keeps its link form, flag or not', () => {
    expect(autocompleteQuery('[[Fo]]', 4, true)).toEqual({
      query: 'Fo',
      from: 0,
      to: 6,
      form: 'link',
    })
  })
})

describe('connectionInsert forms', () => {
  it('writes the embed form with the caret past the closer', () => {
    expect(connectionInsert('Alpha', 3, 'embed')).toEqual({ insert: '![[Alpha]]', caret: 13 })
  })

  it('defaults to the link form', () => {
    expect(connectionInsert('Alpha', 0)).toEqual({ insert: '[[Alpha]]', caret: 9 })
  })
})
