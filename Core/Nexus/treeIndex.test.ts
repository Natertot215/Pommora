import { describe, expect, it } from 'vitest'
import type { NexusTree } from './tree'
import { makeTree, linkedSpacesTree } from '../Testing/testTree'
import { reconcileWith } from '../Session/reconcileSelection'
import {
  navKeysOf,
  nodesOf,
  reconcileIndexOf,
  nodesByIdOf,
  resolveIndexOf,
  searchEntriesOf,
  spaceLinksOf,
} from './treeIndex'
import { pageIndexOf, pagesByIdOf, pagesOf, recordById, recordsOf } from './record'

describe('the record walk', () => {
  it('caches every projection on the tree identity — same tree, same object', () => {
    const t = makeTree()
    expect(reconcileIndexOf(t)).toBe(reconcileIndexOf(t))
    expect(resolveIndexOf(t)).toBe(resolveIndexOf(t))
    expect(searchEntriesOf(t)).toBe(searchEntriesOf(t))
    expect(pagesOf(t)).toBe(pagesOf(t))
    expect(pageIndexOf(t)).toBe(pageIndexOf(t))
    expect(navKeysOf(t)).toBe(navKeysOf(t))
    expect(recordsOf(t)).toBe(recordsOf(t))
    expect(recordById(t)).toBe(recordById(t))
  })

  it('a different tree object derives fresh projections', () => {
    expect(reconcileIndexOf(makeTree())).not.toBe(reconcileIndexOf(makeTree()))
    expect(recordById(makeTree())).not.toBe(recordById(makeTree()))
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

  it('a page whose ID vanished follows the page now at its path', () => {
    const ix = reconcileIndexOf(makeTree())
    const selection = {
      kind: 'page',
      id: '01KZSWEW0WPF1PFWWJSKE8Q83P',
      path: 'Notes/Ideas/Beta.md',
    } as const
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
    expect(ix.get('page:p1')?.path.map((c) => c.title)).toEqual(['Notes'])
    expect(ix.get('page:p2')?.path.map((c) => c.title)).toEqual(['Notes', 'Ideas'])
    expect(ix.get('set:s1')?.path.map((c) => c.title)).toEqual(['Notes'])
    expect(ix.has('context:g1')).toBe(false)
  })
  it('a page in a set inside a set trails through both', () => {
    const t = makeTree()
    t.collections[0].sets?.[0].sets?.push({
      kind: 'set',
      id: 's2',
      title: 'Deep',
      path: 'Notes/Ideas/Deep',
      pages: [{ kind: 'page', id: 'p3', title: 'Gamma', path: 'Notes/Ideas/Deep/Gamma.md' }],
      sets: [],
    })
    const ix = resolveIndexOf(t)
    expect(ix.get('page:p3')?.path.map((c) => c.title)).toEqual(['Notes', 'Ideas', 'Deep'])
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
    expect(alpha?.match).toEqual({ name: 'alpha', place: 'notes alpha' })
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
  it('a page resolves its icon from pageMetadata, and a pageMetadata-only change yields a new trail index but keeps the title index', () => {
    const t = makeTree()
    const iconed: NexusTree = {
      ...t,
      config: { ...t.config, pageMetadata: { p1: { icon: 'star' } } },
    }
    expect(resolveIndexOf(iconed).get('page:p1')?.icon).toBe('star')
    expect(resolveIndexOf(iconed)).not.toBe(resolveIndexOf(t))
    expect(resolveIndexOf(t).get('page:p1')?.icon).not.toBe('star')
    expect(pageIndexOf(iconed)).toBe(pageIndexOf(t))
    expect(searchEntriesOf(iconed)).toBe(searchEntriesOf(t))
    expect(navKeysOf(iconed)).toBe(navKeysOf(t))
  })
})

describe('the connections projections', () => {
  it('pagesOf lists every page at every depth; pagesByIdOf keys them', () => {
    const t = makeTree()
    expect(pagesOf(t).map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(pagesByIdOf(t).get('p2')?.path).toBe('Notes/Ideas/Beta.md')
    expect(nodesByIdOf(t).get('p2')?.path).toBe('Notes/Ideas/Beta.md')
  })

  it('pageIndexOf resolves and autocompletes over the projected pages', () => {
    const idx = pageIndexOf(makeTree())
    expect(idx.resolve('Alpha')).toMatchObject({ status: 'resolved' })
    expect(idx.resolve('Ghost')).toEqual({ status: 'phantom' })
    expect(idx.candidates('nes').map((p) => p.id)).toEqual(['p2', 'p1'])
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

  it('the first listed shows, in the page map and the reconcile index alike', () => {
    const t = withPages([
      { id: 'dup', title: 'Alpha', path: 'Notes/Alpha.md' },
      { id: 'dup', title: 'Alpha copy', path: 'Notes/Alpha copy.md' },
    ])
    expect(pagesByIdOf(t).get('dup')?.path).toBe('Notes/Alpha.md')
    expect(reconcileIndexOf(t).pages.get('dup')).toBe('Notes/Alpha.md')
    expect(reconcileIndexOf(t).pagesByPath.get('Notes/Alpha copy.md')).toBe('dup')
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

describe('a configuration patch keeps every entity lookup', () => {
  it('answers the same objects across a settings change, and rebuilds the reconcile index when unreadable moves', () => {
    const t = makeTree()
    const held = [reconcileIndexOf(t), nodesOf(t), pageIndexOf(t), recordsOf(t)]
    const toggled: NexusTree = {
      ...t,
      config: { ...t.config, personalization: { hideChevrons: true }, crops: {} },
    }
    const kept = [
      reconcileIndexOf(toggled),
      nodesOf(toggled),
      pageIndexOf(toggled),
      recordsOf(toggled),
    ]
    for (const [i, v] of kept.entries()) expect(v).toBe(held[i])
    const unreadable: NexusTree = {
      ...toggled,
      unreadable: [{ path: 'Notes/Bad.md', kind: 'page', reason: 'unparsed' }],
    }
    expect(reconcileIndexOf(unreadable)).not.toBe(held[0])
  })
})
