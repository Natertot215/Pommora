import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  markIndexReady,
  queryKeyHolders,
  queryMembers,
  queryMentions,
  readIndexedStats,
  removePathIndex,
  upsertPageIndex,
} from '@pommora/core/Index/contentIndex'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import {
  describeContentIndexStore,
  describeKeyValueStore,
  describeSnapshotStore,
} from '@pommora/core/Testing/storesContract'
import type { Db } from './driver'
import { openNexusDb } from './open'
import { contentIndexStore, keyValueStore, snapshotStore } from './stores'
import { openVersionsDb } from './versionsDb'

let root: string
let db: Db
let versionsDb: Db

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-stores-'))
  db = openNexusDb(root)!
  versionsDb = openVersionsDb(root)!
})
afterEach(async () => {
  installStores(NO_STORES)
  db?.close()
  versionsDb?.close()
  await rm(root, { recursive: true, force: true })
})

describeKeyValueStore('SQLite key-value store', () => keyValueStore(db))
describeContentIndexStore('SQLite content index', () => contentIndexStore(db))
describeSnapshotStore('SQLite snapshots', () => snapshotStore(versionsDb))

describe('the content index over SQLite', () => {
  it('missing tables answer exactly like a null Db, and writers never throw', () => {
    installStores({
      keyValue: keyValueStore(db),
      contentIndex: contentIndexStore(db),
      snapshots: snapshotStore(versionsDb),
    })
    markIndexReady()
    db.exec(
      'DROP TABLE mentions; DROP TABLE page_values; DROP TABLE memberships; DROP TABLE indexed_files',
    )
    expect(queryMentions('beta')).toBeNull()
    expect(queryKeyHolders('Status')).toBeNull()
    expect(queryMembers('<Projects>', 'pommora')).toBeNull()
    expect(readIndexedStats()).toBeNull()
    expect(() =>
      upsertPageIndex(
        'Notes/A.md',
        { mentions: ['x'], values: {}, memberships: [] },
        {
          mtimeMs: 1000,
          size: 10,
        },
      ),
    ).not.toThrow()
    expect(() => removePathIndex('Notes/A.md')).not.toThrow()
  })
})
