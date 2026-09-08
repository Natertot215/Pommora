import { beforeEach, describe, expect, it } from 'vitest'
import type { KeyValueStore } from '../Platform/machine'
import type { ContentIndexStore, SnapshotStore } from '../Platform/stores'

export function describeKeyValueStore(name: string, make: () => KeyValueStore): void {
  describe(name, () => {
    let store: KeyValueStore
    beforeEach(() => {
      store = make()
    })

    it('round-trips a keyed value and keeps scopes apart', () => {
      store.set('folds', 'p1', 'a')
      store.set('tabs', 'p1', 'b')
      expect(store.get('folds', 'p1')).toBe('a')
      expect(store.entries('folds')).toEqual({ p1: 'a' })
      expect(store.entries('tabs')).toEqual({ p1: 'b' })
    })

    it('a null clears the key rather than storing it', () => {
      store.set('folds', 'p1', 'a')
      store.set('folds', 'p1', null)
      expect(store.get('folds', 'p1')).toBeNull()
      expect(store.entries('folds')).toEqual({})
    })

    it('an absent key is null and an empty scope is {}', () => {
      expect(store.get('folds', 'nope')).toBeNull()
      expect(store.entries('empty')).toEqual({})
    })

    it('a rewrite replaces the value in place', () => {
      store.set('folds', 'p1', 'a')
      store.set('folds', 'p1', 'b')
      expect(store.get('folds', 'p1')).toBe('b')
    })
  })
}

export function describeContentIndexStore(name: string, make: () => ContentIndexStore): void {
  describe(name, () => {
    let store: ContentIndexStore
    const STAT = { mtimeMs: 1000, size: 10 }
    beforeEach(() => {
      store = make()
    })

    it('round-trips an upsert through every query', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          mentions: ['beta'],
          values: { Status: 'Open', '<Projects>': ['Pommora'] },
          memberships: [{ key: '<Projects>', title: 'pommora' }],
        },
        STAT,
      )
      store.upsertPageIndex(
        'Loose/B.md',
        {
          mentions: ['beta', 'gamma'],
          values: { '<Projects>': ['Pommora', 'Sapphire'] },
          memberships: [
            { key: '<Projects>', title: 'pommora' },
            { key: '<Projects>', title: 'sapphire' },
          ],
        },
        STAT,
      )
      expect(store.queryMentions('beta')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMentions('gamma')).toEqual(['Loose/B.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/B.md'])
      expect(store.readIndexedStat('Notes/A.md')).toEqual(STAT)
      expect(store.readIndexedStats().get('Loose/B.md')).toEqual(STAT)
    })

    it('a re-upsert replaces the page rows rather than accreting them', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { mentions: ['beta'], values: { Status: 'Open' }, memberships: [] },
        STAT,
      )
      store.upsertPageIndex(
        'Notes/A.md',
        { mentions: ['gamma'], values: {}, memberships: [] },
        { mtimeMs: 2000, size: 12 },
      )
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryMentions('gamma')).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
    })

    it('serializes a null value rather than dropping the key', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        { mentions: [], values: { Blank: null }, memberships: [] },
        STAT,
      )
      expect(store.queryKeyHolders('Blank')).toEqual(['Notes/A.md'])
    })

    it('removes every row for a path', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          mentions: ['beta'],
          values: { Status: 'Open' },
          memberships: [{ key: '<Projects>', title: 'pommora' }],
        },
        STAT,
      )
      store.removePathIndex('Notes/A.md')
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
    })

    it('renames a path across every table', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          mentions: ['beta'],
          values: { Status: 'Open' },
          memberships: [{ key: '<Projects>', title: 'pommora' }],
        },
        STAT,
      )
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.queryMentions('beta')).toEqual(['Notes/Alpha.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Alpha.md'])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
      expect(store.readIndexedStat('Notes/Alpha.md')).toEqual(STAT)
    })

    it('prefix-renames descendants, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { mentions: ['beta'], values: {}, memberships: [] },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { mentions: ['beta'], values: {}, memberships: [] },
        STAT,
      )
      store.renamePathPrefixIndex('50% Off', 'Sale')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md', 'Sale/A.md'])
    })

    it('prefix-renames across an astral folder name', () => {
      store.upsertPageIndex(
        'Projects 🚀/A.md',
        { mentions: ['beta'], values: {}, memberships: [] },
        STAT,
      )
      store.renamePathPrefixIndex('Projects 🚀', 'Launchpad')
      expect(store.queryMentions('beta')).toEqual(['Launchpad/A.md'])
    })

    it('removes a prefix, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { mentions: ['beta'], values: {}, memberships: [] },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { mentions: ['beta'], values: {}, memberships: [] },
        STAT,
      )
      store.removePathPrefixIndex('50% Off')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md'])
    })
  })
}

export function describeSnapshotStore(name: string, make: () => SnapshotStore): void {
  describe(name, () => {
    let store: SnapshotStore
    beforeEach(() => {
      store = make()
    })

    it('adds, lists newest-first, and reads the latest', () => {
      store.addSnapshot('p1', 100, 'edit', 'first')
      store.addSnapshot('p1', 200, 'external', 'second')
      expect(store.listSnapshots('p1')).toEqual([
        { ts: 200, source: 'external' },
        { ts: 100, source: 'edit' },
      ])
      expect(store.latestSnapshot('p1')).toEqual({ ts: 200, text: 'second' })
      expect(store.readSnapshot('p1', 100)).toBe('first')
      expect(store.readSnapshot('p1', 999)).toBeNull()
      expect(store.latestSnapshot('p2')).toBeNull()
    })

    it('keeps pages apart', () => {
      store.addSnapshot('p1', 100, 'edit', 'a')
      store.addSnapshot('p2', 100, 'edit', 'b')
      expect(store.readSnapshot('p1', 100)).toBe('a')
      expect(store.readSnapshot('p2', 100)).toBe('b')
    })

    it('deletes by timestamp and reports the count', () => {
      store.addSnapshot('p1', 100, 'edit', 'a')
      store.addSnapshot('p1', 200, 'edit', 'b')
      expect(store.deleteSnapshots('p1', [100, 999])).toBe(1)
      expect(store.listSnapshots('p1')).toEqual([{ ts: 200, source: 'edit' }])
    })

    it('sweeps snapshots older than a cutoff', () => {
      store.addSnapshot('p1', 100, 'edit', 'a')
      store.addSnapshot('p1', 300, 'edit', 'b')
      expect(store.sweepSnapshots(200)).toBe(1)
      expect(store.listSnapshots('p1')).toEqual([{ ts: 300, source: 'edit' }])
    })

    it('clears every snapshot and reports the count', () => {
      store.addSnapshot('p1', 100, 'edit', 'a')
      store.addSnapshot('p2', 200, 'edit', 'b')
      expect(store.clearSnapshots()).toBe(2)
      expect(store.listSnapshots('p1')).toEqual([])
    })
  })
}
