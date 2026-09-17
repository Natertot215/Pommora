import { beforeEach, describe, expect, it } from 'vitest'
import type { KeyValueStore } from '../Platform/machine'
import type {
  BaseRecord,
  CaptureStore,
  ContentIndexStore,
  SnapshotStore,
  SyncStore,
} from '../Platform/stores'

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
          headings: [],
          headingMentions: [],
          values: { Status: 'Open', '<Projects>': ['Pommora'] },
          memberships: [{ key: '<Projects>', title: 'pommora' }],
        },
        STAT,
      )
      store.upsertPageIndex(
        'Loose/B.md',
        {
          mentions: ['beta', 'gamma'],
          headings: [],
          headingMentions: [],
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
        {
          mentions: ['beta'],
          headings: [],
          headingMentions: [],
          values: { Status: 'Open' },
          memberships: [],
        },
        STAT,
      )
      store.upsertPageIndex(
        'Notes/A.md',
        { mentions: ['gamma'], headings: [], headingMentions: [], values: {}, memberships: [] },
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
        {
          mentions: [],
          headings: [],
          headingMentions: [],
          values: { Blank: null },
          memberships: [],
        },
        STAT,
      )
      expect(store.queryKeyHolders('Blank')).toEqual(['Notes/A.md'])
    })

    it('removes every row for a path', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          mentions: ['beta'],
          headings: [],
          headingMentions: [],
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
          headings: [],
          headingMentions: [],
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

    it('round-trips headings and heading mentions, then carries them across a rename', () => {
      store.upsertPageIndex(
        'Notes/A.md',
        {
          mentions: [],
          headings: ['setup', 'intro'],
          headingMentions: [{ title: 'beta', heading: 'setup' }],
          values: {},
          memberships: [],
        },
        STAT,
      )
      expect(store.readHeadings()).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.readHeadings(['Notes/A.md'])).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/A.md'])
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.readHeadings()).toEqual({ 'Notes/Alpha.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/Alpha.md'])
    })

    it('prefix-renames descendants, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { mentions: ['beta'], headings: [], headingMentions: [], values: {}, memberships: [] },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { mentions: ['beta'], headings: [], headingMentions: [], values: {}, memberships: [] },
        STAT,
      )
      store.renamePathPrefixIndex('50% Off', 'Sale')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md', 'Sale/A.md'])
    })

    it('prefix-renames across an astral folder name', () => {
      store.upsertPageIndex(
        'Projects 🚀/A.md',
        { mentions: ['beta'], headings: [], headingMentions: [], values: {}, memberships: [] },
        STAT,
      )
      store.renamePathPrefixIndex('Projects 🚀', 'Launchpad')
      expect(store.queryMentions('beta')).toEqual(['Launchpad/A.md'])
    })

    it('removes a prefix, exact on a % folder name', () => {
      store.upsertPageIndex(
        '50% Off/A.md',
        { mentions: ['beta'], headings: [], headingMentions: [], values: {}, memberships: [] },
        STAT,
      )
      store.upsertPageIndex(
        '50% Off More/B.md',
        { mentions: ['beta'], headings: [], headingMentions: [], values: {}, memberships: [] },
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

const base = (path: string, over: Partial<BaseRecord> = {}): BaseRecord => ({
  path,
  mtimeMs: 1_700_000_000_000,
  size: 12,
  hash: 'h',
  blobSha: 'b',
  version: 3,
  baseBytes: null,
  ...over,
})

export function describeSyncStore(name: string, make: () => SyncStore): void {
  describe(name, () => {
    let store: SyncStore
    beforeEach(() => {
      store = make()
    })

    it('round-trips a base record and lists every row', () => {
      store.upsertBase(base('b.md'))
      store.upsertBase(base('a.md', { version: 9 }))
      expect(store.readBase('a.md')).toEqual(base('a.md', { version: 9 }))
      expect(store.readBase('ghost.md')).toBeNull()
      expect(
        store
          .readAllBases()
          .map((r) => r.path)
          .sort(),
      ).toEqual(['a.md', 'b.md'])
      store.upsertBase(base('a.md', { version: 10 }))
      expect(store.readBase('a.md')?.version).toBe(10)
    })

    it('renames one path and deletes one path', () => {
      store.upsertBase(base('a.md'))
      store.upsertBase(base('b.md'))
      store.renameBase('a.md', 'c.md')
      expect(store.readBase('a.md')).toBeNull()
      expect(store.readBase('c.md')?.hash).toBe('h')
      store.deleteBase('b.md')
      expect(
        store
          .readAllBases()
          .map((r) => r.path)
          .sort(),
      ).toEqual(['c.md'])
    })

    it('reads the rows under one path and no sibling that merely shares its opening', () => {
      store.upsertBase(base('Notes/a.md'))
      store.upsertBase(base('Notes/Deep/b.md'))
      store.upsertBase(base('Notes.md'))
      store.upsertBase(base('NotesOther/c.md'))
      store.upsertBase(base('Note%/d.md'))
      expect(
        store
          .readBasesUnder('Notes')
          .map((r) => r.path)
          .sort(),
      ).toEqual(['Notes/Deep/b.md', 'Notes/a.md'])
      expect(store.readBasesUnder('Note%').map((r) => r.path)).toEqual(['Note%/d.md'])
      expect(store.readBasesUnder('Nothing')).toEqual([])
    })

    it('keeps base bytes as bytes and null as null', () => {
      const bytes = new Uint8Array([0x00, 0xff, 0x80])
      store.upsertBase(base('a.md', { baseBytes: bytes }))
      store.upsertBase(base('b.md'))
      expect(store.readBase('a.md')?.baseBytes).toEqual(bytes)
      expect(store.readBase('b.md')?.baseBytes).toBeNull()
    })
  })
}

export function describeCaptureStore(name: string, make: () => CaptureStore): void {
  describe(name, () => {
    let store: CaptureStore
    beforeEach(() => {
      store = make()
    })

    it('adds a capture and sweeps it past the cutoff', () => {
      store.addCapture('a.md', 100, 'local-lost', new Uint8Array([0x61]))
      expect(store.sweepCaptures(200)).toBe(1)
      expect(store.sweepCaptures(200)).toBe(0)
    })
  })
}
