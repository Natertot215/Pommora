import { describe, expect, it } from 'vitest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { makeTree, linkedSpacesTree } from '../Testing/testTree'
import { reconcileWith } from '../Session/reconcileSelection'
import {
  navKeysOf,
  pageIndexOf,
  pagesByIdOf,
  pagesOf,
  reconcileIndexOf,
  recordsByIdOf,
  resolveIndexOf,
  searchEntriesOf,
  spaceLinksOf,
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

  it('a page whose ID vanished follows the page now at its path', () => {
    const ix = reconcileIndexOf(makeTree())
    const selection = { kind: 'page', id: 'adopted-beta', path: 'Notes/Ideas/Beta.md' } as const
    expect(reconcileWith(ix, selection)).toEqual({
      kind: 'page',
      id: 'p2',
      path: 'Notes/Ideas/Beta.md',
    })
  })

  it('a page whose ID vanished with nothing at its path reconciles to none', () => {
    const ix = reconcileIndexOf(makeTree())
    expect(reconcileWith(ix, { kind: 'page', id: 'gone', path: 'Notes/Gone.md' })).toEqual({
      kind: 'none',
    })
  })
})

describe('resolveIndexOf', () => {
  it('holds display cores for the homepage, the Matrix, spaces, collections, sets, and pages — never groups', () => {
    const ix = resolveIndexOf(makeTree())
    expect(ix.get('homepage')?.title).toBe('TestNexus')
    expect(ix.get('matrix')?.title).toBe('Matrix')
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
    expect(entries[1]).toMatchObject({ key: 'matrix', title: 'Matrix' })
    const alpha = entries.find((e) => e.title === 'Alpha')
    expect(alpha?.target).toEqual({ kind: 'page', id: 'p1' })
    expect(alpha?.key).toBe('page:p1')
    expect(alpha?.lower).toBe('alpha')
  })

  it('indexes the homepage, the Matrix, spaces, collections, sets, and pages', () => {
    const entries = searchEntriesOf(makeTree())
    const byKind = (k: string): string[] =>
      entries.filter((e) => e.target.kind === k).map((e) => e.title)
    expect(byKind('homepage')).toEqual(['TestNexus'])
    expect(byKind('matrix')).toEqual(['Matrix'])
    expect(byKind('space').sort()).toEqual(['Pommora', 'Reading', 'Work'])
    expect(byKind('collection')).toEqual(['Notes'])
    expect(byKind('set')).toEqual(['Ideas'])
    expect(byKind('page').sort()).toEqual(['Alpha', 'Nested Beta'])
  })
})

describe('page icons', () => {
  it('a page resolves its icon from pageMetadata, and a pageMetadata-only change yields a new index', () => {
    const t = makeTree()
    const iconed: NexusTree = { ...t, pageMetadata: { p1: { icon: 'star' } } }
    expect(resolveIndexOf(iconed).get('page:p1')?.icon).toBe('star')
    expect(pagesByIdOf(iconed).get('p1')?.icon).toBe('star')
    expect(resolveIndexOf(iconed)).not.toBe(resolveIndexOf(t))
    expect(resolveIndexOf(t).get('page:p1')?.icon).not.toBe('star')
  })
})

describe('the connections projections', () => {
  it('pagesOf lists every page at every depth; pagesByIdOf keys them', () => {
    const t = makeTree()
    expect(pagesOf(t).map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(pagesByIdOf(t).get('p2')?.path).toBe('Notes/Ideas/Beta.md')
    expect(recordsByIdOf(t).get('p2')?.path).toBe('Notes/Ideas/Beta.md')
  })

  it('pageIndexOf resolves and autocompletes over the projected pages', () => {
    const idx = pageIndexOf(makeTree())
    expect(idx.resolve('Alpha')).toMatchObject({ status: 'resolved' })
    expect(idx.resolve('Ghost')).toEqual({ status: 'phantom' })
    expect(idx.candidates('nes').map((p) => p.id)).toEqual(['p2'])
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
    for (const k of [
      'homepage',
      'matrix',
      'space:a1',
      'collection:c1',
      'set:s1',
      'page:p1',
      'page:p2',
    ])
      expect(keys.has(k)).toBe(true)
    expect(keys.has('context:g1')).toBe(false)
  })
})

describe('spaceLinksOf', () => {
  const linkedTree = (bStoresItToo: boolean): NexusTree =>
    linkedSpacesTree({
      aContextValues: { g2: ['b1'] },
      ...(bStoresItToo ? { bContextValues: { g1: ['a1'] } } : {}),
    })

  it('reads one half as a link on both ends', () => {
    const links = spaceLinksOf(linkedTree(false))
    expect(links.get('a1')).toEqual({ g2: ['b1'] })
    expect(links.get('b1')).toEqual({ g1: ['a1'] })
  })

  it('gives a stored pair one entry per end, never two', () => {
    const links = spaceLinksOf(linkedTree(true))
    expect(links.get('a1')).toEqual({ g2: ['b1'] })
    expect(links.get('b1')).toEqual({ g1: ['a1'] })
  })

  it('caches on the tree identity', () => {
    const t = linkedTree(true)
    expect(spaceLinksOf(t)).toBe(spaceLinksOf(t))
  })
})
