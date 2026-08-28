import { describe, expect, it } from 'vitest'
import type { NexusTree } from '@shared/types'
import { makeTree } from './Navigation/testTree'
import { reconcileWith } from '@renderer/Actions/selection'
import {
  containersByPathOf,
  navKeysOf,
  pageIndexOf,
  pagesByIdOf,
  pagesOf,
  reconcileIndexOf,
  resolveIndexOf,
  searchEntriesOf,
} from './treeIndex'

describe('the record walk', () => {
  it('caches every projection on the tree identity — same tree, same object', () => {
    const t = makeTree()
    expect(reconcileIndexOf(t)).toBe(reconcileIndexOf(t))
    expect(resolveIndexOf(t)).toBe(resolveIndexOf(t))
    expect(searchEntriesOf(t)).toBe(searchEntriesOf(t))
    expect(pagesOf(t)).toBe(pagesOf(t))
    expect(pageIndexOf(t)).toBe(pageIndexOf(t))
    expect(navKeysOf(t)).toBe(navKeysOf(t))
  })

  it('a different tree object derives fresh projections', () => {
    expect(reconcileIndexOf(makeTree())).not.toBe(reconcileIndexOf(makeTree()))
  })
})

describe('reconcileIndexOf', () => {
  it('buckets every kind; Context-group ids never leak into the Space bucket', () => {
    const ix = reconcileIndexOf(makeTree())
    expect(ix.spaces.has('a1')).toBe(true)
    expect(ix.spaces.has('g1')).toBe(false)
    expect(ix.collections.has('c1')).toBe(true)
    expect(ix.sets.get('s1')).toBe('Notes/Ideas')
    expect(ix.pages.get('p2')).toBe('Notes/Ideas/Beta.md')
  })

  it('a Context-group selection reconciles dead — no layer holds what none can render', () => {
    const ix = reconcileIndexOf(makeTree())
    expect(reconcileWith(ix, { kind: 'context', id: 'g1' })).toEqual({ kind: 'none' })
  })
})

describe('resolveIndexOf', () => {
  it('holds display cores for homepage, spaces, collections, sets, and pages — never groups', () => {
    const ix = resolveIndexOf(makeTree())
    expect(ix.get('homepage')?.title).toBe('TestNexus')
    expect(ix.get('space:a1')?.path.map((c) => c.title)).toEqual(['Realms'])
    expect(ix.get('page:p2')?.path.map((c) => c.title)).toEqual(['Notes', 'Ideas'])
    expect(ix.get('set:s1')?.path.map((c) => c.title)).toEqual(['Notes'])
    expect(ix.has('context:g1')).toBe(false)
  })
})

describe('searchEntriesOf', () => {
  it('lists entries grouped by kind with ready-to-select refs', () => {
    const entries = searchEntriesOf(makeTree())
    expect(entries[0]).toMatchObject({ key: 'homepage', title: 'TestNexus' })
    const alpha = entries.find((e) => e.title === 'Alpha')
    expect(alpha?.target).toEqual({ kind: 'page', id: 'p1' })
    expect(alpha?.key).toBe('page:p1')
    expect(alpha?.lower).toBe('alpha')
  })

  it('indexes homepage, spaces, collections, sets, and pages', () => {
    const entries = searchEntriesOf(makeTree())
    const byKind = (k: string): string[] =>
      entries.filter((e) => e.target.kind === k).map((e) => e.title)
    expect(byKind('homepage')).toEqual(['TestNexus'])
    expect(byKind('space').sort()).toEqual(['Pommora', 'Reading', 'Work'])
    expect(byKind('collection')).toEqual(['Notes'])
    expect(byKind('set')).toEqual(['Ideas'])
    expect(byKind('page').sort()).toEqual(['Alpha', 'Nested Beta'])
  })
})

describe('the connections projections', () => {
  it('pagesOf lists every page at every depth; pagesByIdOf keys them', () => {
    const t = makeTree()
    expect(pagesOf(t).map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(pagesByIdOf(t).get('p2')?.path).toBe('Notes/Ideas/Beta.md')
  })

  it('pageIndexOf resolves and autocompletes over the projected pages', () => {
    const idx = pageIndexOf(makeTree())
    expect(idx.resolve('Alpha')).toMatchObject({ status: 'resolved' })
    expect(idx.resolve('Ghost')).toEqual({ status: 'phantom' })
    expect(idx.candidates('nes').map((p) => p.id)).toEqual(['p2'])
  })
})

describe('containersByPathOf', () => {
  it('maps collection and set paths to their display cores', () => {
    const m = containersByPathOf(makeTree())
    expect(m.get('Notes')).toMatchObject({ title: 'Notes', kind: 'collection' })
    expect(m.get('Notes/Ideas')).toMatchObject({ title: 'Ideas', kind: 'set' })
  })
})

describe('duplicate ids — a copied .md carries its id in frontmatter', () => {
  const withPages = (pages: { id: string; title: string; path: string }[]): NexusTree => {
    const t = makeTree()
    t.collections[0].pages = pages.map((p) => ({ kind: 'page', ...p }))
    return t
  }

  it('keeps both copies listed for search and connections', () => {
    const t = withPages([
      { id: 'dup', title: 'Alpha', path: 'Notes/Alpha.md' },
      { id: 'dup', title: 'Alpha copy', path: 'Notes/Alpha copy.md' },
    ])
    expect(pagesOf(t).map((p) => p.title)).toEqual(['Alpha', 'Alpha copy', 'Nested Beta'])
    expect(pageIndexOf(t).resolve('Alpha')).toMatchObject({ status: 'resolved' })
    expect(searchEntriesOf(t).filter((e) => e.target.kind === 'page')).toHaveLength(3)
  })

  it('two same-titled copies stay ambiguous, never silently resolved to one', () => {
    const t = withPages([
      { id: 'dup', title: 'Alpha', path: 'Notes/Alpha.md' },
      { id: 'dup', title: 'Alpha', path: 'Journal/Alpha.md' },
    ])
    expect(pageIndexOf(t).resolve('Alpha')).toEqual({ status: 'ambiguous' })
  })
})

describe('navKeysOf', () => {
  it('enumerates the closed key universe, homepage included, at every depth', () => {
    const keys = new Set(navKeysOf(makeTree()))
    for (const k of ['homepage', 'space:a1', 'collection:c1', 'set:s1', 'page:p1', 'page:p2'])
      expect(keys.has(k)).toBe(true)
    expect(keys.has('context:g1')).toBe(false)
  })
})
