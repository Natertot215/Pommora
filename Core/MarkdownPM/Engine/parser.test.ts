import { describe, it, expect } from 'vitest'
import { parse } from './parser'
import { codeMask, lineStartAt } from './markdownCode'

describe('parse (mdast seam)', () => {
  it('parses GFM into an mdast tree', () => {
    const tree = parse('# Hi\n\n- [ ] task')
    expect(tree.type).toBe('root')
    expect(tree.children.map((n) => n.type)).toContain('heading')
  })

  it('parses GFM tables (gfm extension active)', () => {
    const tree = parse('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(tree.children.map((n) => n.type)).toContain('table')
  })

  it('nodes carry source offsets', () => {
    const tree = parse('# Hi')
    expect(tree.children[0].position?.start.offset).toBe(0)
  })
})

describe('codeMask', () => {
  it('true between fences, false outside', () => {
    const t = 'before\n```\ncode\n```\nafter'
    expect(codeMask(t)(t.indexOf('code') + 1)).toBe(true)
    expect(codeMask(t)(t.indexOf('after') + 1)).toBe(false)
    expect(codeMask(t)(t.indexOf('before') + 1)).toBe(false)
  })
})

describe('line bounds', () => {
  it('starts the first line at 0 even where the document opens on a newline', () => {
    expect(lineStartAt('\ntext', 0)).toBe(0)
    expect(lineStartAt('\ntext', 1)).toBe(1)
    expect(lineStartAt('a\nb', 3)).toBe(2)
  })
})
