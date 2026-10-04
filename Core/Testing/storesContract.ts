import { foldKey } from '../Paths/caseFold'
import { beforeEach, describe, expect, it } from 'vitest'
import type {
  BaseRecord,
  CaptureStore,
  ContentIndexStore,
  KeyValueStore,
  PageIndexEntry,
  RelationKind,
  Relation,
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
      store.write('folds', { p1: 'a' })
      store.write('tabs', { p1: 'b' })
      expect(store.get('folds', 'p1')).toBe('a')
      expect(store.entries('folds')).toEqual({ p1: 'a' })
      expect(store.entries('tabs')).toEqual({ p1: 'b' })
    })

    it('a null clears the key rather than storing it', () => {
      store.write('folds', { p1: 'a' })
      store.write('folds', { p1: null })
      expect(store.get('folds', 'p1')).toBeNull()
      expect(store.entries('folds')).toEqual({})
    })

    it('an absent key is null and an empty scope is {}', () => {
      expect(store.get('folds', 'nope')).toBeNull()
      expect(store.entries('empty')).toEqual({})
    })

    it('writes a batch of rows, clearing the nulls, in one call', () => {
      store.write('folds', { p1: 'a', p2: 'b' })
      store.write('folds', { p1: null, p3: 'c' })
      expect(store.entries('folds')).toEqual({ p2: 'b', p3: 'c' })
    })

    it('a rewrite replaces the value in place', () => {
      store.write('folds', { p1: 'a' })
      store.write('folds', { p1: 'b' })
      expect(store.get('folds', 'p1')).toBe('b')
    })
  })
}

export function describeContentIndexStore(name: string, make: () => ContentIndexStore): void {
  describe(name, () => {
    let store: ContentIndexStore
    const STAT = { mtimeMs: 1000, size: 10 }
    // Built rather than spelled: `space` takes (key, title) in `queryMembers` order, so the transposition onto (target, qualifier) reads on one line and a reversed binding reads wrong at the call site.
    const relation = (kind: RelationKind, target: string, qualifier = ''): Relation => ({
      kind,
      target,
      qualifier,
      count: 1,
    })
    const body = (target: string, qualifier = ''): Relation => relation('body', target, qualifier)
    const space = (key: string, title: string): Relation => relation('space', title, foldKey(key))
    const upsert = (path: string, entry: PageIndexEntry, stat = STAT): void =>
      store.upsertPageIndexes([{ path, entry, stat }])
    beforeEach(() => {
      store = make()
    })

    it('round-trips an upsert through every query', () => {
      upsert('Notes/A.md', {
        relations: [body('beta'), space('<Projects>', 'pommora')],
        headings: [],
        values: { Status: 'Open', '<Projects>': ['Pommora'] },
      })
      upsert('Loose/B.md', {
        relations: [
          body('beta'),
          body('gamma'),
          space('<Projects>', 'pommora'),
          space('<Projects>', 'sapphire'),
        ],
        headings: [],
        values: { '<Projects>': ['Pommora', 'Sapphire'] },
      })
      expect(store.queryMentions('beta')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMentions('gamma')).toEqual(['Loose/B.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/B.md'])
      expect(store.readIndexedStat('Notes/A.md')).toEqual(STAT)
      expect(store.readIndexedStats().get('Loose/B.md')).toEqual(STAT)
    })

    it('a re-upsert replaces the page rows rather than accreting them', () => {
      upsert('Notes/A.md', { relations: [body('beta')], headings: [], values: { Status: 'Open' } })
      upsert(
        'Notes/A.md',
        { relations: [body('gamma')], headings: [], values: {} },
        { mtimeMs: 2000, size: 12 },
      )
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryMentions('gamma')).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
    })

    it('answers a key holder in any casing, listing a page once', () => {
      upsert('Notes/A.md', { relations: [], headings: [], values: { Status: 'Open' } })
      upsert('Notes/B.md', { relations: [], headings: [], values: { tags: ['a'], Tags: ['b'] } })
      expect(store.queryKeyHolders('status')).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('TAGS')).toEqual(['Notes/B.md'])
    })

    it('serializes a null value rather than dropping the key', () => {
      upsert('Notes/A.md', { relations: [], headings: [], values: { Blank: null } })
      expect(store.queryKeyHolders('Blank')).toEqual(['Notes/A.md'])
    })

    it('removes every row for a path', () => {
      upsert('Notes/A.md', {
        relations: [body('beta'), space('<Projects>', 'pommora')],
        headings: [],
        values: { Status: 'Open' },
      })
      store.removePathIndex('Notes/A.md')
      expect(store.queryMentions('beta')).toEqual([])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
    })

    it('renames a path across every table', () => {
      upsert('Notes/A.md', {
        relations: [body('beta'), space('<Projects>', 'pommora')],
        headings: [],
        values: { Status: 'Open' },
      })
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.queryMentions('beta')).toEqual(['Notes/Alpha.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Alpha.md'])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
      expect(store.readIndexedStat('Notes/Alpha.md')).toEqual(STAT)
    })

    it('round-trips headings and heading mentions, then carries them across a rename', () => {
      upsert('Notes/A.md', {
        relations: [body('beta', 'setup')],
        headings: ['setup', 'intro'],
        values: {},
      })
      expect(store.readHeadings()).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.readHeadings(['Notes/A.md'])).toEqual({ 'Notes/A.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/A.md'])
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.readHeadings()).toEqual({ 'Notes/Alpha.md': ['setup', 'intro'] })
      expect(store.queryHeadingMentions('beta', 'setup')).toEqual(['Notes/Alpha.md'])
    })

    it('a page with no headings reads as an empty list, cold and by path alike', () => {
      upsert('Notes/H.md', { relations: [], headings: [], values: {} })
      expect(store.readHeadings()).toEqual({ 'Notes/H.md': [] })
      expect(store.readHeadings(['Notes/H.md'])).toEqual({ 'Notes/H.md': [] })
    })

    it("reads the page-to-page rows and every page's values, whole and by path", () => {
      upsert('Notes/A.md', {
        relations: [body('beta'), relation('citation', 'gamma'), space('<Projects>', 'pommora')],
        headings: [],
        values: { ID: 'idA', Status: ['Open'] },
      })
      upsert(
        'Notes/B.md',
        { relations: [], headings: [], values: { ID: 'idB' } },
        { mtimeMs: 2000, size: 20 },
      )
      const whole = store.readPageRelations()
      expect(whole.relations).toEqual([
        { path: 'Notes/A.md', ...body('beta') },
        { path: 'Notes/A.md', ...relation('citation', 'gamma') },
      ])
      expect(whole.pages).toEqual({
        'Notes/A.md': { values: { ID: 'idA', Status: ['Open'] }, mtimeMs: 1000 },
        'Notes/B.md': { values: { ID: 'idB' }, mtimeMs: 2000 },
      })
      const narrowed = store.readPageRelations(['Notes/B.md'])
      expect(narrowed.relations).toEqual([])
      expect(narrowed.pages).toEqual({ 'Notes/B.md': { values: { ID: 'idB' }, mtimeMs: 2000 } })
    })

    it('a heading-naming link answers the bare title query', () => {
      upsert('Notes/A.md', { relations: [body('beta', 'setup')], headings: [], values: {} })
      expect(store.queryMentions('beta')).toEqual(['Notes/A.md'])
    })

    it('returns a path once however many rows reach the target', () => {
      upsert('Notes/A.md', {
        relations: [
          body('beta'),
          body('beta', 'setup'),
          relation('embed', 'beta'),
          relation('citation', 'beta'),
        ],
        headings: [],
        values: {},
      })
      expect(store.queryMentions('beta')).toEqual(['Notes/A.md'])
    })

    it('keeps space rows out of the title queries and link rows out of the member query', () => {
      upsert('Notes/A.md', { relations: [space('<Projects>', 'beta')], headings: [], values: {} })
      upsert('Loose/B.md', { relations: [body('beta')], headings: [], values: {} })
      expect(store.queryMentions('beta')).toEqual(['Loose/B.md'])
      expect(store.queryHeadingMentions('beta', '')).toEqual(['Loose/B.md'])
      expect(store.queryMembers('<Projects>', 'beta')).toEqual(['Notes/A.md'])
    })

    it('prefix-renames descendants, exact on a % folder name', () => {
      upsert('50% Off/A.md', { relations: [body('beta')], headings: [], values: {} })
      upsert('50% Off More/B.md', { relations: [body('beta')], headings: [], values: {} })
      store.renamePathPrefixIndex('50% Off', 'Sale')
      expect(store.queryMentions('beta')).toEqual(['50% Off More/B.md', 'Sale/A.md'])
    })

    it('prefix-renames across an astral folder name', () => {
      upsert('Projects 🚀/A.md', { relations: [body('beta')], headings: [], values: {} })
      store.renamePathPrefixIndex('Projects 🚀', 'Launchpad')
      expect(store.queryMentions('beta')).toEqual(['Launchpad/A.md'])
    })

    it('removes a prefix, exact on a % folder name', () => {
      upsert('50% Off/A.md', { relations: [body('beta')], headings: [], values: {} })
      upsert('50% Off More/B.md', { relations: [body('beta')], headings: [], values: {} })
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
      store.addSnapshot('p1', 200, 'edit', 'b')
      store.addSnapshot('p1', 300, 'edit', 'c')
      expect(store.sweepSnapshots(200)).toBe(1)
      expect(store.listSnapshots('p1')).toEqual([
        { ts: 300, source: 'edit' },
        { ts: 200, source: 'edit' },
      ])
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

    it('holds one row per path however its case is written, under the case last recorded', () => {
      store.upsertBase(base('Notes/Café.md'))
      expect(store.readBase('notes/CAFÉ.md')?.path).toBe('Notes/Café.md')
      store.upsertBase(base('notes/café.md', { version: 4 }))
      expect(store.readAllBases().map((r) => [r.path, r.version])).toEqual([['notes/café.md', 4]])
      store.renameBase('NOTES/CAFÉ.md', 'Notes/Cafe.md')
      expect(store.readBasesUnder('NOTES').map((r) => r.path)).toEqual(['Notes/Cafe.md'])
      store.deleteBase('notes/cafe.md')
      expect(store.readAllBases()).toEqual([])
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
