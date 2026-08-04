import { describe, expect, it } from 'vitest'
import { embedDeleteSpan, embedInsertAfter, embedPickTree } from './embedGripMenu'
import { autocompleteQuery } from '../autocomplete'
import type { NexusTree } from '@shared/types'

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

  it('the Insert ▸ Page pair hands off to the embed autocomplete', () => {
    const doc = 'para\nnext'
    const c = embedInsertAfter(doc, 4, '![[]]')
    const next = doc.slice(0, c.from) + c.insert + doc.slice(c.to)
    expect(next).toBe('para\n\n![[]]\n\nnext')
    const q = autocompleteQuery(next, c.caret - 2, true)
    expect(q).toMatchObject({ form: 'embed', query: '' })
    expect(next.slice(q?.from, q?.to)).toBe('![[]]')
  })
})

describe('embedDeleteSpan', () => {
  const del = (doc: string, from: number, to: number): string => {
    const s = embedDeleteSpan(doc, { from, to })
    return doc.slice(0, s.from) + doc.slice(s.to)
  }

  it('a double-fenced tile keeps a single separator', () => {
    const doc = 'A\n\n![[E]]\n\nB'
    expect(del(doc, 3, 9)).toBe('A\n\nB')
  })

  it('a glued tile takes only its own line', () => {
    const doc = 'A\n![[E]]\nB'
    expect(del(doc, 2, 8)).toBe('A\nB')
  })

  it('a doc-end tile eats its preceding newline', () => {
    const doc = 'A\n![[E]]'
    expect(del(doc, 2, 8)).toBe('A')
  })
})

describe('embedPickTree', () => {
  const tree = {
    collections: [
      {
        id: 'c1',
        title: 'Notes',
        path: 'Notes',
        sets: [
          { id: 's1', title: 'Drafts', path: 'Notes/Drafts', sets: [], pages: [{ id: 'p2', title: 'Beta', path: 'Notes/Drafts/Beta.md' }], views: [] },
        ],
        pages: [{ id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }],
        views: [],
      },
      { id: 'c2', title: 'Empty', path: 'Empty', sets: [], pages: [], views: [] },
    ],
  } as unknown as NexusTree

  it('walks collections → sets → pages and prunes empties', () => {
    const t = embedPickTree(tree, new Set())
    expect(t).toHaveLength(1)
    expect(t[0].label).toBe('Notes')
    expect(t[0].children?.map((n) => n.label)).toEqual(['Drafts', 'Alpha'])
    expect(t[0].children?.[0].children?.[0]).toEqual({ label: 'Beta', title: 'Beta' })
  })

  it('excluded titles drop out, and a container emptied by exclusion drops with them', () => {
    const t = embedPickTree(tree, new Set(['beta']))
    expect(t[0].children?.map((n) => n.label)).toEqual(['Alpha'])
  })
})
