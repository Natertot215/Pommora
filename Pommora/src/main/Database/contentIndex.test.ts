import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './driver'
import { openSessionDb, closeSessionDb, sessionDb } from '../sessionDb'
import { readScope } from './localState'
import {
  markIndexReady,
  queryKeyHolders,
  queryMentions,
  readIndexedStats,
  removePathIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndex,
} from './contentIndex'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-cindex-'))
  openSessionDb(root)
  markIndexReady()
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const STAT = { mtimeMs: 1000, size: 10 }

describe('the content index', () => {
  it('round-trips an upsert through both queries', () => {
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: { Status: 'Open' } }, STAT)
    upsertPageIndex('Loose/B.md', { mentions: ['beta', 'gamma'], values: {} }, STAT)
    expect(queryMentions('beta')).toEqual(['Loose/B.md', 'Notes/A.md'])
    expect(queryMentions('gamma')).toEqual(['Loose/B.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(readIndexedStats()?.get('Notes/A.md')).toEqual(STAT)
  })

  it("a re-upsert replaces a page's rows rather than accreting them", () => {
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: { Status: 'Open' } }, STAT)
    upsertPageIndex('Notes/A.md', { mentions: ['gamma'], values: {} }, { mtimeMs: 2000, size: 12 })
    expect(queryMentions('beta')).toEqual([])
    expect(queryMentions('gamma')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual([])
    expect(readIndexedStats()?.get('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
  })

  it('no mentions is an empty array; NO INDEX is null — the two never conflate', () => {
    upsertPageIndex('Notes/A.md', { mentions: [], values: {} }, STAT)
    expect(queryMentions('beta')).toEqual([])
    closeSessionDb()
    expect(queryMentions('beta')).toBeNull()
    expect(queryKeyHolders('Status')).toBeNull()
    expect(readIndexedStats()).toBeNull()
  })

  it('missing tables answer exactly like a null Db, and writers never throw', () => {
    sessionDb()?.exec('DROP TABLE mentions; DROP TABLE page_values; DROP TABLE indexed_files')
    expect(queryMentions('beta')).toBeNull()
    expect(queryKeyHolders('Status')).toBeNull()
    expect(readIndexedStats()).toBeNull()
    expect(() => upsertPageIndex('Notes/A.md', { mentions: ['x'], values: {} }, STAT)).not.toThrow()
    expect(() => removePathIndex('Notes/A.md')).not.toThrow()
  })

  it('queries answer null until a seed stamps the handle ready — empty tables never masquerade', async () => {
    closeSessionDb()
    await rm(join(root, '.nexus'), { recursive: true, force: true })
    openSessionDb(root)
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: {} }, STAT)
    expect(queryMentions('beta')).toBeNull()
    markIndexReady()
    expect(queryMentions('beta')).toEqual(['Notes/A.md'])
  })

  it('a prefix rename survives an astral folder name (SQL-side character arithmetic)', () => {
    upsertPageIndex('Projects 🚀/A.md', { mentions: ['beta'], values: {} }, STAT)
    renamePathPrefixIndex('Projects 🚀', 'Launchpad')
    expect(queryMentions('beta')).toEqual(['Launchpad/A.md'])
  })

  it('a rename moves every row to the new path', () => {
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: { Status: 'Open' } }, STAT)
    renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
    expect(queryMentions('beta')).toEqual(['Notes/Alpha.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
    expect(readIndexedStats()?.get('Notes/Alpha.md')).toEqual(STAT)
  })

  it('a removal clears every row for the path', () => {
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: { Status: 'Open' } }, STAT)
    removePathIndex('Notes/A.md')
    expect(queryMentions('beta')).toEqual([])
    expect(queryKeyHolders('Status')).toEqual([])
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
  })
})

describe('upgrade in place', () => {
  it('a pre-index database gains the tables on open with its rows intact', async () => {
    closeSessionDb()
    await rm(root, { recursive: true, force: true })
    root = await mkdtemp(join(tmpdir(), 'pom-cindex-v1-'))
    // A database as the pre-index schema wrote it: meta + local_state alone, stamped v1.
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(root, '.nexus'), { recursive: true })
    const v1 = openDb(join(root, '.nexus', 'nexus.db'))
    if (!v1) throw new Error('fixture db failed to open')
    v1.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE local_state (scope TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (scope, key));
      INSERT INTO meta (key, value) VALUES ('schema_version', '1');
      INSERT INTO local_state (scope, key, value) VALUES ('folds', 'p1', '["x"]');
    `)
    v1.close()

    openSessionDb(root)
    markIndexReady()
    expect(readScope('folds')).toEqual({ p1: ['x'] })
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: {} }, STAT)
    expect(queryMentions('beta')).toEqual(['Notes/A.md'])
    expect(readScope('folds')).toEqual({ p1: ['x'] })
  })
})
