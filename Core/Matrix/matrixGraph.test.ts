import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { markIndexReady } from '../Index/contentIndex'
import { idTime } from '../Nexus/ids'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { localIso } from '@pommora/uix/Utilities/pad'
import { readMatrixGraph } from './matrixGraph'

const A = '01KVGMT8BFP350FZZXAMG1QDRN'
const B = '01KVGMT8BFP350FZZXAMG1QDRW'
const C = '01KVGMT8BFP350FZZXAMG1QDRX'

let stores: ReturnType<typeof memoryStores>

const relation = (kind: 'body' | 'value' | 'embed', target: string, key = '') => ({
  kind,
  target,
  qualifier: '',
  key,
})

beforeEach(() => {
  stores = memoryStores()
  installStores(stores.stores)
  markIndexReady()
  const index = stores.stores.contentIndex!
  index.upsertPageIndexes([
    {
      path: 'Notes/A.md',
      entry: {
        relations: [relation('body', 'beta')],
        headings: [],
        values: { ID: A, Status: ['Open'] },
      },
      stat: { mtimeMs: 1000, size: 10 },
    },
  ])
  index.upsertPageIndexes([
    {
      path: 'Notes/B.md',
      entry: { relations: [relation('value', 'alpha', 'Ref')], headings: [], values: { ID: B } },
      stat: { mtimeMs: 2000, size: 20 },
    },
  ])
  index.upsertPageIndexes([
    {
      path: 'Notes/Loose.md',
      entry: { relations: [relation('body', 'alpha')], headings: [], values: {} },
      stat: { mtimeMs: 3000, size: 30 },
    },
  ])
})

afterEach(() => {
  installStores(NO_STORES)
})

describe('readMatrixGraph', () => {
  it('keys values by page id and stamps both dates through localIso', () => {
    const values = readMatrixGraph(true)!.values!
    expect(Object.keys(values).sort()).toEqual([A, B])
    expect(values[A]).toEqual({
      frontmatter: { ID: A, Status: ['Open'] },
      createdAt: localIso(idTime(A)),
      modifiedAt: localIso(1000),
    })
    expect(values[B].modifiedAt).toBe(localIso(2000))
  })

  it('drops an id-less markdown file, its rows included', () => {
    const reply = readMatrixGraph(true)!
    expect(reply.values?.['Notes/Loose.md']).toBeUndefined()
    expect(reply.links.map((l) => l.path)).toEqual(['Notes/A.md', 'Notes/B.md'])
    expect(reply.links.map((l) => l.pageId)).toEqual([A, B])
  })

  it('names every page id at the asked paths, linked or not', () => {
    stores.stores.contentIndex!.upsertPageIndexes([
      {
        path: 'Notes/C.md',
        entry: { relations: [], headings: [], values: { ID: C } },
        stat: { mtimeMs: 4000, size: 40 },
      },
    ])
    expect(readMatrixGraph(false, ['Notes/B.md', 'Notes/C.md'])!.ids!.sort()).toEqual([B, C])
  })

  it('narrows to the named paths', () => {
    const reply = readMatrixGraph(true, ['Notes/A.md'])!
    expect(Object.keys(reply.values!)).toEqual([A])
    expect(reply.links).toEqual([
      { path: 'Notes/A.md', kind: 'body', target: 'beta', key: '', pageId: A },
    ])
  })

  it('answers one link where a page names another and its headings', () => {
    stores.stores.contentIndex!.upsertPageIndexes([
      {
        path: 'Notes/A.md',
        entry: {
          relations: [
            relation('body', 'beta'),
            { ...relation('body', 'beta'), qualifier: 'setup' },
            { ...relation('body', 'beta'), qualifier: 'intro' },
          ],
          headings: [],
          values: { ID: A },
        },
        stat: { mtimeMs: 1000, size: 10 },
      },
    ])
    expect(readMatrixGraph(true, ['Notes/A.md'])!.links).toEqual([
      { path: 'Notes/A.md', kind: 'body', target: 'beta', key: '', pageId: A },
    ])
  })

  it('answers one link per key where a value names a page under two, so each reaches the keys rule', () => {
    stores.stores.contentIndex!.upsertPageIndexes([
      {
        path: 'Notes/B.md',
        entry: {
          relations: [relation('value', 'alpha', 'Ref'), relation('value', 'alpha', 'Rank')],
          headings: [],
          values: { ID: B },
        },
        stat: { mtimeMs: 2000, size: 20 },
      },
    ])
    expect(readMatrixGraph(true, ['Notes/B.md'])!.links.map((l) => l.key)).toEqual(['Ref', 'Rank'])
  })

  it('an embed reaches no edge', () => {
    stores.stores.contentIndex!.upsertPageIndexes([
      {
        path: 'Notes/A.md',
        entry: {
          relations: [relation('embed', 'gamma'), relation('body', 'beta')],
          headings: [],
          values: { ID: A },
        },
        stat: { mtimeMs: 1000, size: 10 },
      },
    ])
    expect(readMatrixGraph(true, ['Notes/A.md'])!.links.map((l) => l.target)).toEqual(['beta'])
  })

  it('reads no values when none are asked for', () => {
    expect(readMatrixGraph(false)!.values).toBeNull()
  })

  it('answers null with no index', () => {
    installStores(NO_STORES)
    expect(readMatrixGraph(true)).toBeNull()
  })
})
