import { rm } from 'node:fs/promises'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  markIndexReady,
  queryKeyHolders,
  queryMembers,
  queryMentions,
  readIndexedStats,
  removePathIndex,
  upsertPageIndexes,
} from '@pommora/core/Index/contentIndex'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import {
  describeCaptureStore,
  describeContentIndexStore,
  describeKeyValueStore,
  describeSnapshotStore,
  describeSyncStore,
} from '@pommora/core/Testing/storesContract'
import type { Db } from './driver'
import { openNexusDb } from './open'
import { contentIndexStore, keyValueStore, syncStore } from './stores'
import { captureStore, openVersionsDb, snapshotStore } from './versionsDb'

let root: string
let dir: string
let db: Db
let versionsDb: Db

beforeEach(async () => {
  root = tempRoot('pom-stores-')
  dir = tempRoot('pom-stores-store-')
  db = openNexusDb(dir, root)!
  versionsDb = openVersionsDb(dir)!
})
afterEach(async () => {
  installStores(NO_STORES)
  db?.close()
  versionsDb?.close()
  await rm(root, { recursive: true, force: true })
  await rm(dir, { recursive: true, force: true })
})

describeKeyValueStore('SQLite key-value store', () => keyValueStore(db))
describeContentIndexStore('SQLite content index', () => contentIndexStore(db))
describeSnapshotStore('SQLite snapshots', () => snapshotStore(versionsDb))
describeSyncStore('SQLite sync bases', () => syncStore(db))
describeCaptureStore('SQLite captures', () => captureStore(versionsDb))

describe('the key-value store over SQLite', () => {
  it('writes a batch whole or not at all', () => {
    const store = keyValueStore(db)
    expect(() => store.write('folds', { a: 'x', b: {} as never })).toThrow()
    expect(store.entries('folds')).toEqual({})
    store.write('folds', { a: 'x' })
    expect(store.entries('folds')).toEqual({ a: 'x' })
  })
})

describe('the content index over SQLite', () => {
  it('reads a batch of paths past SQLite’s variable limit', () => {
    const store = contentIndexStore(db)
    store.upsertPageIndexes([
      {
        path: 'Notes/A.md',
        entry: { relations: [], headings: ['setup'], values: {} },
        stat: { mtimeMs: 1, size: 1 },
      },
    ])
    const only = ['Notes/A.md', ...Array.from({ length: 40_000 }, (_, i) => `Notes/${i}.md`)]
    expect(store.readHeadings(only)['Notes/A.md']).toEqual(['setup'])
    expect(Object.keys(store.readPageRelations(only).pages)).toEqual(['Notes/A.md'])
  })

  it('writes a batch of pages whole or not at all', () => {
    const store = contentIndexStore(db)
    const stat = { mtimeMs: 1, size: 1 }
    expect(() =>
      store.upsertPageIndexes([
        { path: 'Notes/A.md', entry: { relations: [], headings: ['a'], values: {} }, stat },
        {
          path: 'Notes/B.md',
          entry: { relations: [], headings: [], values: { Count: BigInt(1) } },
          stat,
        },
      ]),
    ).toThrow()
    expect(store.readIndexedStats().size).toBe(0)
    expect(store.readHeadings(['Notes/A.md'])['Notes/A.md']).toEqual([])
  })

  it('missing tables answer exactly like a null Db, and writers never throw', () => {
    installStores({
      keyValue: keyValueStore(db),
      contentIndex: contentIndexStore(db),
      snapshots: snapshotStore(versionsDb),
      sync: syncStore(db),
      captures: captureStore(versionsDb),
    })
    markIndexReady()
    db.exec(
      'DROP TABLE relations; DROP TABLE headings; DROP TABLE page_values; DROP TABLE indexed_files',
    )
    expect(queryMentions('beta')).toBeNull()
    expect(queryKeyHolders('Status')).toBeNull()
    expect(queryMembers('<Projects>', 'pommora')).toBeNull()
    expect(readIndexedStats()).toBeNull()
    expect(() =>
      upsertPageIndexes([
        {
          path: 'Notes/A.md',
          entry: {
            relations: [{ kind: 'body', target: 'x', qualifier: '', count: 1 }],
            headings: [],
            values: {},
          },
          stat: {
            mtimeMs: 1000,
            size: 10,
          },
        },
      ]),
    ).not.toThrow()
    expect(() => removePathIndex('Notes/A.md')).not.toThrow()
  })
})
