import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import {
  markIndexReady,
  queryKeyHolders,
  queryMembers,
  queryMentions,
  readIndexedStats,
  removePathIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndex,
} from './contentIndex'

beforeEach(() => {
  installStores(memoryStores().stores)
  markIndexReady()
})
afterEach(() => {
  installStores(NO_STORES)
})

const STAT = { mtimeMs: 1000, size: 10 }
const TAGGED = {
  mentions: ['beta'],
  values: { Status: 'Open', '<Projects>': ['Pommora'] },
  memberships: [{ key: '<Projects>', title: 'pommora' }],
}

describe('the content index', () => {
  it('round-trips an upsert through every query', () => {
    upsertPageIndex(
      'Notes/A.md',
      {
        mentions: ['beta'],
        values: { Status: 'Open', '<Projects>': ['Pommora'] },
        memberships: [{ key: '<Projects>', title: 'pommora' }],
      },
      STAT,
    )
    upsertPageIndex(
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
    expect(queryMentions('beta')).toEqual(['Loose/B.md', 'Notes/A.md'])
    expect(queryMentions('gamma')).toEqual(['Loose/B.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/A.md'])
    expect(queryMembers('<Projects>')).toEqual(['Loose/B.md', 'Notes/A.md'])
    expect(queryMembers('<Projects>', 'sapphire')).toEqual(['Loose/B.md'])
    expect(queryMembers('<Areas>', 'pommora')).toEqual([])
    expect(readIndexedStats()?.get('Notes/A.md')).toEqual(STAT)
  })

  it("a re-upsert replaces a page's rows rather than accreting them", () => {
    upsertPageIndex(
      'Notes/A.md',
      {
        mentions: ['beta'],
        values: { Status: 'Open' },
        memberships: [{ key: '<Projects>', title: 'pommora' }],
      },
      STAT,
    )
    upsertPageIndex(
      'Notes/A.md',
      { mentions: ['gamma'], values: {}, memberships: [] },
      { mtimeMs: 2000, size: 12 },
    )
    expect(queryMentions('beta')).toEqual([])
    expect(queryMentions('gamma')).toEqual(['Notes/A.md'])
    expect(queryKeyHolders('Status')).toEqual([])
    expect(queryMembers('<Projects>', 'pommora')).toEqual([])
    expect(readIndexedStats()?.get('Notes/A.md')).toEqual({ mtimeMs: 2000, size: 12 })
  })

  it('no mentions is an empty array; NO INDEX is null — the two never conflate', () => {
    upsertPageIndex('Notes/A.md', { mentions: [], values: {}, memberships: [] }, STAT)
    expect(queryMentions('beta')).toEqual([])
    installStores(NO_STORES)
    expect(queryMentions('beta')).toBeNull()
    expect(queryKeyHolders('Status')).toBeNull()
    expect(queryMembers('<Projects>', 'pommora')).toBeNull()
    expect(readIndexedStats()).toBeNull()
  })

  it('queries answer null until a seed stamps the handle ready — empty tables never masquerade', async () => {
    installStores(NO_STORES)
    installStores(memoryStores().stores)
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: {}, memberships: [] }, STAT)
    expect(queryMentions('beta')).toBeNull()
    markIndexReady()
    expect(queryMentions('beta')).toEqual(['Notes/A.md'])
  })

  it('a prefix rename survives an astral folder name (SQL-side character arithmetic)', () => {
    upsertPageIndex('Projects 🚀/A.md', { mentions: ['beta'], values: {}, memberships: [] }, STAT)
    renamePathPrefixIndex('Projects 🚀', 'Launchpad')
    expect(queryMentions('beta')).toEqual(['Launchpad/A.md'])
  })

  it('a rename moves every row to the new path', () => {
    upsertPageIndex('Notes/A.md', TAGGED, STAT)
    renamePathIndex('Notes/A.md', 'Notes/Alpha.md')
    expect(queryMentions('beta')).toEqual(['Notes/Alpha.md'])
    expect(queryKeyHolders('Status')).toEqual(['Notes/Alpha.md'])
    expect(queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Alpha.md'])
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
    expect(readIndexedStats()?.get('Notes/Alpha.md')).toEqual(STAT)
  })

  it('a removal clears every row for the path', () => {
    upsertPageIndex('Notes/A.md', TAGGED, STAT)
    removePathIndex('Notes/A.md')
    expect(queryMentions('beta')).toEqual([])
    expect(queryKeyHolders('Status')).toEqual([])
    expect(queryMembers('<Projects>', 'pommora')).toEqual([])
    expect(readIndexedStats()?.has('Notes/A.md')).toBe(false)
  })
})
