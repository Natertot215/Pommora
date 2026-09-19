import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { markIndexReady } from '../Index/contentIndex'
import { idTime } from '../Nexus/ids'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { iso } from '../Views/loadValues'
import { readMatrixGraph } from './matrixGraph'

const A = '01KVGMT8BFP350FZZXAMG1QDRN'
const B = '01KVGMT8BFP350FZZXAMG1QDRW'

let stores: ReturnType<typeof memoryStores>

const node = (kind: 'body' | 'frontmatter', target: string) => ({
  kind,
  target,
  qualifier: '',
  count: 1,
})

beforeEach(() => {
  stores = memoryStores()
  installStores(stores.stores)
  markIndexReady()
  const index = stores.stores.contentIndex!
  index.upsertPageIndex(
    'Notes/A.md',
    { matrix: [node('body', 'beta')], headings: [], values: { ID: A, Status: ['Open'] } },
    { mtimeMs: 1000, size: 10 },
  )
  index.upsertPageIndex(
    'Notes/B.md',
    { matrix: [node('frontmatter', 'alpha')], headings: [], values: { ID: B } },
    { mtimeMs: 2000, size: 20 },
  )
  index.upsertPageIndex(
    'Notes/Loose.md',
    { matrix: [node('body', 'alpha')], headings: [], values: {} },
    { mtimeMs: 3000, size: 30 },
  )
})

afterEach(() => {
  installStores(NO_STORES)
})

describe('readMatrixGraph', () => {
  it('keys values by page id and stamps both dates through iso', () => {
    const reply = readMatrixGraph()!
    expect(Object.keys(reply.values).sort()).toEqual([A, B])
    expect(reply.values[A]).toEqual({
      frontmatter: { ID: A, Status: ['Open'] },
      createdAt: iso(idTime(A)),
      modifiedAt: iso(1000),
    })
    expect(reply.values[B].modifiedAt).toBe(iso(2000))
  })

  it('drops an id-less markdown file, its rows included', () => {
    const reply = readMatrixGraph()!
    expect(reply.values['Notes/Loose.md']).toBeUndefined()
    expect(reply.links.map((l) => l.path)).toEqual(['Notes/A.md', 'Notes/B.md'])
    expect(reply.links.map((l) => l.pageId)).toEqual([A, B])
  })

  it('narrows to the named paths', () => {
    const reply = readMatrixGraph(['Notes/A.md'])!
    expect(Object.keys(reply.values)).toEqual([A])
    expect(reply.links).toEqual([{ path: 'Notes/A.md', ...node('body', 'beta'), pageId: A }])
  })

  it('answers null with no index', () => {
    installStores(NO_STORES)
    expect(readMatrixGraph()).toBeNull()
  })
})
