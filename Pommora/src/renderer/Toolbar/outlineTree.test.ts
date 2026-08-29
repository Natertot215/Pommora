import { describe, it, expect } from 'vitest'
import { headingOutline } from '../MarkdownPM/Editor/folding'
import { outlineTree, type OutlineNode } from './outlineTree'

const shape = (nodes: OutlineNode[]): unknown =>
  nodes.map((n) => (n.children.length > 0 ? { [n.text]: shape(n.children) } : n.text))

const outlineOf = (doc: string): unknown => shape(outlineTree(headingOutline(doc)))

describe('outlineTree — nesting by level', () => {
  it('nests each heading under the nearest shallower one', () => {
    expect(outlineOf('# A\n## B\n### C\n## D\n# E\n')).toEqual([{ A: [{ B: ['C'] }, 'D'] }, 'E'])
  })
  it('a skipped level nests rather than dropping to the root', () => {
    expect(outlineOf('# A\n### C\n')).toEqual([{ A: ['C'] }])
  })
  it('a document that opens deep roots at its own shallowest level', () => {
    expect(outlineOf('### A\n### B\n')).toEqual(['A', 'B'])
  })
  it('a deeper heading followed by a shallower one closes the run', () => {
    expect(outlineOf('## A\n#### B\n# C\n')).toEqual([{ A: ['B'] }, 'C'])
  })
  it('no headings is an empty tree, not a throw', () => {
    expect(outlineOf('just prose\n')).toEqual([])
  })
})
