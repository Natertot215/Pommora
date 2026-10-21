import { beforeEach, describe, expect, it } from 'vitest'
import type {
  BaseRecord,
  CaptureStore,
  ContentIndexStore,
  KeyValueStore,
  PageHeading,
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

const OUTLINE: PageHeading[] = [
  { text: 'Setup', level: 2 },
  { text: 'Intro', level: 3 },
]

export function describeContentIndexStore(name: string, make: () => ContentIndexStore): void {
  describe(name, () => {
    let store: ContentIndexStore
    const STAT = { mtimeMs: 1000, size: 10 }
    // Built rather than spelled: `space` takes (key, title) in `queryMembers` order, so the transposition onto (target, qualifier) reads on one line and a reversed binding reads wrong at the call site.
    const relation = (kind: RelationKind, target: string, qualifier = '', key = ''): Relation => ({
      kind,
      target,
      qualifier,
      key,
    })
    const body = (target: string, qualifier = ''): Relation => relation('body', target, qualifier)
    const space = (key: string, title: string): Relation => relation('space', title, key)
    const upsert = (path: string, entry: PageIndexEntry, stat = STAT): void =>
      store.upsertPageIndexes([{ path, entry, stat }])
    beforeEach(() => {
      store = make()
    })

    it('answers every page linking any of several keys, once each, in path order', () => {
      upsert('Notes/A.md', {
        relations: [body('beta'), body('b/beta', 'setup')],
        headings: [],
        values: {},
      })
      upsert('Loose/B.md', {
        relations: [body('gamma'), body('beta', 'setup')],
        headings: [],
        values: {},
      })
      upsert('Zeta/C.md', { relations: [body('delta', 'setup')], headings: [], values: {} })
      expect(store.queryMentions(['beta', 'gamma'])).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMentions(['beta', 'b/beta'], 'setup')).toEqual(['Loose/B.md', 'Notes/A.md'])
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
      expect(store.queryMentions(['beta'])).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMentions(['gamma'])).toEqual(['Loose/B.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Loose/B.md', 'Notes/A.md'])
      expect(store.queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/B.md'])
      expect(store.readIndexedStat('Notes/A.md')).toEqual(STAT)
      expect(store.readIndexedStats().get('Loose/B.md')).toEqual(STAT)
    })

    it('a stat carries the non-empty string the page holds under the exact `ID` key, and nothing else', () => {
      const values = (values: Record<string, unknown>): PageIndexEntry => ({
        relations: [],
        headings: [],
        values,
      })
      upsert('Notes/A.md', values({ ID: 'p1', id: 'other' }))
      upsert('Notes/B.md', values({ id: 'p2' }))
      upsert('Notes/C.md', values({ ID: 7 }))
      upsert('Notes/D.md', values({ ID: ['p4'] }))
      upsert('Notes/E.md', values({}))
      upsert('Notes/F.md', values({ ID: '' }))
      expect(store.readIndexedStat('Notes/A.md')).toEqual({ ...STAT, id: 'p1' })
      for (const path of ['Notes/B.md', 'Notes/C.md', 'Notes/D.md', 'Notes/E.md', 'Notes/F.md'])
        expect(store.readIndexedStat(path)).toEqual(STAT)
      expect(store.readIndexedStats().get('Notes/A.md')).toEqual({ ...STAT, id: 'p1' })
      expect(store.readIndexedStats().get('Notes/D.md')).toEqual(STAT)
    })

    it('reads the stats under a folder alone, not the folder itself or a sibling sharing its opening', () => {
      const none: PageIndexEntry = { relations: [], headings: [], values: {} }
      for (const path of ['Notes', 'Notes/A.md', 'Notes/Sub/B.md', 'Notes2/C.md', 'Loose/D.md'])
        upsert(path, none)
      expect([...store.readIndexedStats('Notes').keys()].sort()).toEqual([
        'Notes/A.md',
        'Notes/Sub/B.md',
      ])
    })

    it('a re-upsert replaces the page rows rather than accreting them', () => {
      upsert('Notes/A.md', { relations: [body('beta')], headings: [], values: { Status: 'Open' } })
      upsert(
        'Notes/A.md',
        { relations: [body('gamma')], headings: [], values: {} },
        { mtimeMs: 2000, size: 12 },
      )
      expect(store.queryMentions(['beta'])).toEqual([])
      expect(store.queryMentions(['gamma'])).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('Status')).toEqual([])
      expect(store.readIndexedStat('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
    })

    it('answers a key holder by its exact key', () => {
      upsert('Notes/A.md', { relations: [], headings: [], values: { Status: 'Open' } })
      upsert('Notes/B.md', { relations: [], headings: [], values: { tags: ['a'], Tags: ['b'] } })
      expect(store.queryKeyHolders('status')).toEqual([])
      expect(store.queryKeyHolders('TAGS')).toEqual([])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/A.md'])
      expect(store.queryKeyHolders('Tags')).toEqual(['Notes/B.md'])
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
      expect(store.queryMentions(['beta'])).toEqual([])
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
      expect(store.queryMentions(['beta'])).toEqual(['Notes/Alpha.md'])
      expect(store.queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
      expect(store.queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Alpha.md'])
      expect(store.readIndexedStat('Notes/A.md')).toBeNull()
      expect(store.readIndexedStat('Notes/Alpha.md')).toEqual(STAT)
    })

    it('round-trips headings and heading mentions, then carries them across a rename', () => {
      upsert('Notes/A.md', {
        relations: [body('beta', 'setup')],
        headings: OUTLINE,
        values: {},
      })
      expect(store.readHeadings()).toEqual({ 'Notes/A.md': OUTLINE })
      expect(store.readHeadings(['Notes/A.md'])).toEqual({ 'Notes/A.md': OUTLINE })
      expect(store.queryMentions(['beta'], 'setup')).toEqual(['Notes/A.md'])
      store.renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
      expect(store.readHeadings()).toEqual({ 'Notes/Alpha.md': OUTLINE })
      expect(store.queryMentions(['beta'], 'setup')).toEqual(['Notes/Alpha.md'])
    })

    it('a page with no headings reads as an empty list, cold and by path alike', () => {
      upsert('Notes/H.md', { relations: [], headings: [], values: {} })
      expect(store.readHeadings()).toEqual({ 'Notes/H.md': [] })
      expect(store.readHeadings(['Notes/H.md'])).toEqual({ 'Notes/H.md': [] })
    })

    it("reads the page-to-page rows and every page's values, whole, by path, and by key", () => {
      upsert('Notes/A.md', {
        relations: [
          body('beta'),
          relation('citation', 'gamma'),
          relation('embed', 'delta'),
          space('<Projects>', 'pommora'),
        ],
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
        { path: 'Notes/A.md', ...relation('embed', 'delta') },
      ])
      expect(whole.pages).toEqual({
        'Notes/A.md': { values: { ID: 'idA', Status: ['Open'] }, mtimeMs: 1000 },
        'Notes/B.md': { values: { ID: 'idB' }, mtimeMs: 2000 },
      })
      const narrowed = store.readPageRelations(['Notes/B.md'])
      expect(narrowed.relations).toEqual([])
      expect(narrowed.pages).toEqual({ 'Notes/B.md': { values: { ID: 'idB' }, mtimeMs: 2000 } })
      expect(store.readPageRelations(undefined, 'ID').pages).toEqual({
        'Notes/A.md': { values: { ID: 'idA' }, mtimeMs: 1000 },
        'Notes/B.md': { values: { ID: 'idB' }, mtimeMs: 2000 },
      })
    })

    it('one target under two keys is two `value` rows, each read back with its key', () => {
      upsert('Notes/A.md', {
        relations: [relation('value', 'beta', '', 'Ref'), relation('value', 'beta', '', 'Notes')],
        headings: [],
        values: {},
      })
      const rows = store.readPageRelations().relations
      expect(rows.sort((a, b) => a.key.localeCompare(b.key))).toEqual([
        { path: 'Notes/A.md', ...relation('value', 'beta', '', 'Notes') },
        { path: 'Notes/A.md', ...relation('value', 'beta', '', 'Ref') },
      ])
      expect(store.queryMentions(['beta'])).toEqual(['Notes/A.md'])
    })

    it('a heading-naming link answers the bare title query', () => {
      upsert('Notes/A.md', { relations: [body('beta', 'setup')], headings: [], values: {} })
      expect(store.queryMentions(['beta'])).toEqual(['Notes/A.md'])
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
      expect(store.queryMentions(['beta'])).toEqual(['Notes/A.md'])
    })

    it('keeps space rows out of the title queries and link rows out of the member query', () => {
      upsert('Notes/A.md', { relations: [space('<Projects>', 'beta')], headings: [], values: {} })
      upsert('Loose/B.md', { relations: [body('beta')], headings: [], values: {} })
      expect(store.queryMentions(['beta'])).toEqual(['Loose/B.md'])
      expect(store.queryMentions(['beta'], '')).toEqual(['Loose/B.md'])
      expect(store.queryMembers('<Projects>', 'beta')).toEqual(['Notes/A.md'])
    })

    it('prefix-renames descendants, exact on a % folder name', () => {
      upsert('50% Off/A.md', { relations: [body('beta')], headings: [], values: {} })
      upsert('50% Off More/B.md', { relations: [body('beta')], headings: [], values: {} })
      store.renamePathPrefixIndex('50% Off', 'Sale')
      expect(store.queryMentions(['beta'])).toEqual(['50% Off More/B.md', 'Sale/A.md'])
    })

    it('prefix-renames across an astral folder name', () => {
      upsert('Projects 🚀/A.md', { relations: [body('beta')], headings: [], values: {} })
      store.renamePathPrefixIndex('Projects 🚀', 'Launchpad')
      expect(store.queryMentions(['beta'])).toEqual(['Launchpad/A.md'])
    })

    it('removes a prefix, exact on a % folder name', () => {
      upsert('50% Off/A.md', { relations: [body('beta')], headings: [], values: {} })
      upsert('50% Off More/B.md', { relations: [body('beta')], headings: [], values: {} })
      store.removePathPrefixIndex('50% Off')
      expect(store.queryMentions(['beta'])).toEqual(['50% Off More/B.md'])
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

    it('sweeps snapshots older than the live cutoff, and an archived page’s older than its own', () => {
      for (const id of ['p1', 'p2']) {
        store.addSnapshot(id, 100, 'edit', 'a')
        store.addSnapshot(id, 200, 'edit', 'b')
        store.addSnapshot(id, 300, 'edit', 'c')
      }
      expect(store.sweepSnapshots(200, { ids: ['p2'], cutoffMs: 300 })).toBe(3)
      expect(store.listSnapshots('p1')).toEqual([
        { ts: 300, source: 'edit' },
        { ts: 200, source: 'edit' },
      ])
      expect(store.listSnapshots('p2')).toEqual([{ ts: 300, source: 'edit' }])
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
