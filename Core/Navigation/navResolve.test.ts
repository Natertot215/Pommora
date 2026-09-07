import { describe, it, expect } from 'vitest'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import {
  pageTargetFromNav,
  type ResolvedNav,
  resolveFavorites,
  resolvePins,
  resolveRecents,
  resolveWith,
} from './navResolve'
import { pagesByIdOf, resolveIndexOf } from '../Nexus/treeIndex'
import { makeTree } from '../Testing/testTree'

describe('resolveWith — single entry', () => {
  const resolveOne = (tree: Parameters<typeof resolveIndexOf>[0], entry: NavRef) =>
    resolveWith(resolveIndexOf(tree), entry)

  const pathTitles = (r: { path: { title: string }[] } | null): string[] =>
    (r?.path ?? []).map((c) => c.title)

  it('resolves a page to title + its container-chain path', () => {
    const r = resolveOne(makeTree(), { kind: 'page', id: 'p2' })
    expect(r).toMatchObject({ kind: 'page', title: 'Nested Beta' })
    expect(pathTitles(r)).toEqual(['Notes', 'Ideas'])
  })

  it('resolves a set to its parent chain (excluding itself)', () => {
    const r = resolveOne(makeTree(), { kind: 'set', id: 's1' })
    expect(r).toMatchObject({ kind: 'set', title: 'Ideas' })
    expect(pathTitles(r)).toEqual(['Notes'])
  })

  it('resolves a Space to its title with the owning Context as the path', () => {
    const t = {
      ...makeTree(),
      contexts: [
        {
          def: { id: 'g1', title: 'Realms', singular: 'Realm' },
          spaces: [
            {
              kind: 'space' as const,
              id: 'sp1',
              title: 'Astral',
              path: '.nexus/contexts/Realms/Astral',
              contextId: 'g1',
            },
          ],
        },
      ],
    }
    const r = resolveOne(t, { kind: 'space', id: 'sp1' })
    expect(r).toMatchObject({ kind: 'space', title: 'Astral' })
    expect(pathTitles(r)).toEqual(['Realms'])
    expect(r?.icon).toBeTruthy()
  })

  it('resolves a collection (no path) and homepage', () => {
    const t = makeTree()
    const col = resolveOne(t, { kind: 'collection', id: 'c1' })
    expect(col).toMatchObject({ title: 'Notes' })
    expect(pathTitles(col)).toEqual([])
    expect(resolveOne(t, { kind: 'homepage' })).toMatchObject({ title: 'TestNexus' })
  })

  it('resolves an entry icon for each kind', () => {
    const t = makeTree()
    expect(resolveOne(t, { kind: 'page', id: 'p1' })?.icon).toBeTruthy()
    expect(resolveOne(t, { kind: 'collection', id: 'c1' })?.icon).toBeTruthy()
  })

  it('render-prunes a gone entry (returns null) — never mutates storage', () => {
    expect(resolveOne(makeTree(), { kind: 'page', id: 'ghost' })).toBeNull()
    expect(resolveOne(makeTree(), { kind: 'collection', id: 'ghost' })).toBeNull()
  })

  it('resolves agenda kinds to null in v1 (no destination yet)', () => {
    expect(resolveOne(makeTree(), { kind: 'task', id: 'tk1' })).toBeNull()
    expect(resolveOne(makeTree(), { kind: 'event', id: 'ev1' })).toBeNull()
  })

  it('hands back the bare ref as the click target', () => {
    const r = resolveOne(makeTree(), { kind: 'page', id: 'p1' })
    expect(r?.target).toEqual({ kind: 'page', id: 'p1' })
  })
})

describe('resolveIndexOf + resolveWith (index built once, O(1) per entry)', () => {
  it('resolves against a prebuilt index and prunes absent keys', () => {
    const index = resolveIndexOf(makeTree())
    expect(resolveWith(index, { kind: 'page', id: 'p1' })?.title).toBe('Alpha')
    expect(resolveWith(index, { kind: 'page', id: 'ghost' })).toBeNull()
    expect(resolveWith(index, { kind: 'task', id: 'tk1' })).toBeNull()
  })
})

describe('resolveRecents', () => {
  it('preserves MRU order (pins are their own list now — no float)', () => {
    const recents: NavRef[] = [
      { kind: 'page', id: 'p1' },
      { kind: 'page', id: 'p2' },
      { kind: 'collection', id: 'c1' },
    ]
    expect(resolveRecents(resolveIndexOf(makeTree()), recents).map((r) => r.key)).toEqual([
      'page:p1',
      'page:p2',
      'collection:c1',
    ])
  })

  it('drops gone entries from the render list only', () => {
    const recents: NavRef[] = [
      { kind: 'page', id: 'p1' },
      { kind: 'page', id: 'ghost' },
    ]
    expect(resolveRecents(resolveIndexOf(makeTree()), recents).map((r) => r.key)).toEqual([
      'page:p1',
    ])
  })
})

describe('resolveFavorites', () => {
  it('preserves stored order and prunes gone entries', () => {
    const favorites: NavRef[] = [
      { kind: 'collection', id: 'c1' },
      { kind: 'collection', id: 'ghost' },
      { kind: 'context', id: 'a1' },
    ]
    expect(resolveFavorites(resolveIndexOf(makeTree()), favorites).map((r) => r.key)).toEqual([
      'collection:c1',
    ])
  })
})

describe('resolvePins', () => {
  it('marks each pinned, preserves caller order, prunes gone entries', () => {
    const pins: NavRef[] = [
      { kind: 'collection', id: 'c1' },
      { kind: 'collection', id: 'ghost' },
      { kind: 'context', id: 'a1' },
    ]
    const out = resolvePins(resolveIndexOf(makeTree()), pins)
    expect(out.map((r) => r.key)).toEqual(['collection:c1'])
    expect(out.every((r) => r.pinned === true)).toBe(true)
  })
})

describe('pageTargetFromNav', () => {
  const navFor = (ref: NavRef, tree = makeTree()) =>
    resolveWith(resolveIndexOf(tree), ref) as ResolvedNav

  it('resolves a page row to the same file path the id→path map gives', () => {
    const tree = makeTree()
    const it = navFor({ kind: 'page', id: 'p1' }, tree)
    expect(pageTargetFromNav(it, tree)).toEqual({
      kind: 'page',
      id: 'p1',
      path: pagesByIdOf(tree).get('p1')?.path,
    })
  })

  it('returns null for a non-page nav ref', () => {
    const tree = makeTree()
    expect(pageTargetFromNav(navFor({ kind: 'collection', id: 'c1' }, tree), tree)).toBeNull()
  })

  it('returns null when the page id is absent from the tree', () => {
    const orphan: ResolvedNav = {
      key: 'page:ghost',
      target: { kind: 'page', id: 'ghost' },
      kind: 'page',
      title: 'Ghost',
      icon: 'file',
      path: [],
    }
    expect(pageTargetFromNav(orphan, makeTree())).toBeNull()
  })

  it('returns null when the tree is null', () => {
    expect(pageTargetFromNav(navFor({ kind: 'page', id: 'p1' }), null)).toBeNull()
  })
})
