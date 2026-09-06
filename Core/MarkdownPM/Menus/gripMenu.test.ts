import { describe, expect, it } from 'vitest'
import { blockDeleteSpan, embedPickTree } from './gripMenu'
import type { PickNode } from '@pommora/core/Actions/gripMenu'

describe('blockDeleteSpan', () => {
  const del = (doc: string, from: number, to: number): string => {
    const s = blockDeleteSpan(doc, { from, to })
    return doc.slice(0, s.from) + doc.slice(s.to)
  }

  it('a double-fenced block keeps a single separator', () => {
    const doc = 'A\n\n![[E]]\n\nB'
    expect(del(doc, 3, 9)).toBe('A\n\nB')
  })

  it('a glued block takes only its own line', () => {
    const doc = 'A\n![[E]]\nB'
    expect(del(doc, 2, 8)).toBe('A\nB')
  })

  it('a doc-end block eats its preceding newline', () => {
    const doc = 'A\n![[E]]'
    expect(del(doc, 2, 8)).toBe('A')
  })

  it('a blank-fenced multi-line block leaves no doubled blank behind', () => {
    const doc = 'A\n\n> [!note] head\n> body\n\nB'
    expect(del(doc, 3, 24)).toBe('A\n\nB')
  })
})

describe('embedPickTree', () => {
  const tree: PickNode[] = [
    {
      label: 'Notes',
      children: [
        { label: 'Drafts', children: [{ label: 'Beta', title: 'Beta' }] },
        { label: 'Alpha', title: 'Alpha' },
      ],
    },
    { label: 'Empty', children: [] },
  ]

  it('walks containers to pages and prunes empties', () => {
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
