import { describe, expect, it } from 'vitest'
import { blockDeleteSpan, embedPickTree } from './gripMenu'
import type { PickItem } from '../../Actions/menuModel'

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
  const tree: PickItem<string>[] = [
    {
      label: 'Notes',
      submenu: [
        { label: 'Drafts', submenu: [{ label: 'Beta', pick: 'Beta' }] },
        { label: 'Alpha', pick: 'Alpha' },
      ],
    },
    { label: 'Empty', submenu: [] },
  ]

  it('walks containers to pages, keeping an empty container as an empty branch', () => {
    const t = embedPickTree(tree, new Set())
    expect(t.map((n) => n.label)).toEqual(['Notes', 'Empty'])
    expect(t[0].submenu?.map((n) => n.label)).toEqual(['Drafts', 'Alpha'])
    expect(t[0].submenu?.[0].submenu?.[0]).toEqual({ label: 'Beta', pick: 'Beta' })
    expect(t[1].submenu).toEqual([])
  })

  it('excluded titles drop out, and a container emptied by exclusion stays as an empty branch', () => {
    const t = embedPickTree(tree, new Set(['beta']))
    expect(t[0].submenu?.map((n) => n.label)).toEqual(['Drafts', 'Alpha'])
    expect(t[0].submenu?.[0].submenu).toEqual([])
  })
})
