import { describe, expect, it } from 'vitest'
import { BASE_RADIUS } from './forces'
import { buildGraph, type GraphInput } from './graph'

const input: GraphInput = {
  pages: [
    { id: 'a', title: 'Alpha', folderId: 'c1', spaceIds: ['s1'] },
    { id: 'b', title: 'Beta', folderId: 'set1', spaceIds: [] },
    { id: 'c', title: 'Gamma', folderId: 'c2', spaceIds: ['s1'] },
  ],
  folders: [
    { id: 'c1', title: 'Notes', parentId: null },
    { id: 'set1', title: 'Ideas', parentId: 'c1' },
    { id: 'c2', title: 'Other', parentId: null },
    { id: 'set2', title: 'Hollow', parentId: 'c2' },
  ],
  spaces: [
    { id: 's1', title: 'Work', spaceIds: ['s2'] },
    { id: 's2', title: 'Pommora', spaceIds: [] },
    { id: 's3', title: 'Idle', spaceIds: [] },
  ],
  connections: [
    { from: 'a', to: 'b', kind: 'body' },
    { from: 'a', to: 'b', kind: 'citation' },
    { from: 'b', to: 'c', kind: 'frontmatter' },
  ],
}
const all = { hideUnlinked: false, visible: null }

describe('buildGraph', () => {
  it('connection mode draws pages and their connections only', () => {
    const g = buildGraph(input, { ...all, mode: 'connection' })
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(g.links.map((l) => l.kind)).toEqual(['body', 'citation', 'frontmatter'])
    expect(g.nodes[1].degree).toBe(3)
  })

  it('location mode adds every folder as a hub and links containment', () => {
    const g = buildGraph(input, { ...all, mode: 'location' })
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'c1', 'set1', 'c2', 'set2'])
    const location = g.links.filter((l) => l.kind === 'location')
    expect(location.map((l) => [g.nodes[l.source].id, g.nodes[l.target].id])).toEqual([
      ['a', 'c1'],
      ['b', 'set1'],
      ['c', 'c2'],
      ['set1', 'c1'],
      ['set2', 'c2'],
    ])
  })

  it('hideUnlinked in Location mode drops a folder with no pages beneath it and keeps one that holds a page at depth', () => {
    const g = buildGraph(input, { ...all, mode: 'location', hideUnlinked: true })
    expect(g.index.has('set2')).toBe(false)
    expect(g.index.has('c1')).toBe(true)
  })

  it('space mode links pages to their Spaces and Spaces to the Spaces they tag', () => {
    const g = buildGraph(input, { ...all, mode: 'space' })
    const space = g.links.filter((l) => l.kind === 'space')
    expect(space.map((l) => [g.nodes[l.source].id, g.nodes[l.target].id])).toEqual([
      ['a', 's1'],
      ['c', 's1'],
      ['s1', 's2'],
    ])
  })

  it('hideUnlinked in Space mode drops a space no page is tagged with, even one another space tags', () => {
    const g = buildGraph(input, { ...all, mode: 'space', hideUnlinked: true })
    expect(g.index.has('s3')).toBe(false)
    expect(g.index.has('s2')).toBe(false)
    expect(g.index.has('b')).toBe(true)
  })

  it('hideUnlinked in Connection mode drops a page with no link', () => {
    const g = buildGraph(
      { ...input, connections: [] },
      { ...all, mode: 'connection', hideUnlinked: true },
    )
    expect(g.nodes).toEqual([])
  })

  it('the default keeps every node, linked or not', () => {
    const g = buildGraph({ ...input, connections: [] }, { ...all, mode: 'space' })
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 's1', 's2', 's3'])
  })

  it('a connection to a page the filter hides draws nothing', () => {
    const g = buildGraph(input, { ...all, mode: 'connection', visible: new Set(['a', 'c']) })
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(g.links).toEqual([])
  })

  it('links are re-indexed after a drop, the id map matches, and degree counts only surviving links', () => {
    const g = buildGraph(input, { ...all, mode: 'space', hideUnlinked: true })
    for (const l of g.links) expect(g.index.get(g.nodes[l.source].id)).toBe(l.source)
    expect(g.nodes[g.index.get('s1') as number].degree).toBe(2)
  })

  it('a hub grows with members, a page with inbound links, never with outbound', () => {
    const g = buildGraph(input, { ...all, mode: 'space' })
    const r = (id: string) => g.nodes[g.index.get(id) as number].radius
    expect(r('s1')).toBeGreaterThan(r('s2'))
    expect(r('b')).toBeGreaterThan(r('a'))
    expect(r('a')).toBe(BASE_RADIUS.page)
  })
})
