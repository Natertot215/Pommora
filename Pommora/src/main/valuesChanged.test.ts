import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from '@shared/types'
import { flushValueWrites, noteValueWrite, pageIdIndex } from './valuesChanged'

const held = { tree: null as NexusTree | null }
vi.mock('./liveTree', () => ({ getLiveTree: () => held.tree }))

const ROOT = '/nexus'
const tree = (rootPath: string): NexusTree =>
  ({
    nexus: { rootPath },
    contexts: [],
    collections: [
      {
        kind: 'collection',
        path: 'Notes',
        pages: [{ id: 'pA', path: 'Notes/A.md' }],
        sets: [
          {
            kind: 'set',
            path: 'Notes/Deep',
            pages: [{ id: 'pD', path: 'Notes/Deep/D.md' }],
            sets: [],
          },
        ],
      },
      { kind: 'collection', path: 'Ideas', pages: [{ id: 'pI', path: 'Ideas/I.md' }], sets: [] },
    ],
  }) as unknown as NexusTree

beforeEach(() => {
  held.tree = tree(ROOT)
  flushValueWrites(ROOT)
})

describe('the write leg of values:changed', () => {
  it('groups noted writes by container and resolves ids through nested sets', () => {
    noteValueWrite(ROOT, join(ROOT, 'Notes/A.md'))
    noteValueWrite(ROOT, join(ROOT, 'Notes/Deep/D.md'))
    noteValueWrite(ROOT, join(ROOT, 'Ideas/I.md'))
    noteValueWrite(ROOT, join(ROOT, 'Notes/A.md'))
    expect(flushValueWrites(ROOT)).toEqual([
      { rel: 'Notes', pageIds: ['pA'] },
      { rel: 'Notes/Deep', pageIds: ['pD'] },
      { rel: 'Ideas', pageIds: ['pI'] },
    ])
  })

  it('a flush drains the ledger', () => {
    noteValueWrite(ROOT, join(ROOT, 'Notes/A.md'))
    flushValueWrites(ROOT)
    expect(flushValueWrites(ROOT)).toEqual([])
  })

  it('a file the tree does not hold still names its container, with no id', () => {
    noteValueWrite(ROOT, join(ROOT, 'Notes/New.md'))
    expect(flushValueWrites(ROOT)).toEqual([{ rel: 'Notes', pageIds: [] }])
  })

  it('a tree held for another root resolves nothing', () => {
    held.tree = tree('/elsewhere')
    noteValueWrite(ROOT, join(ROOT, 'Notes/A.md'))
    expect(flushValueWrites(ROOT)).toEqual([{ rel: 'Notes', pageIds: [] }])
  })

  it('no root, or a file outside it, notes nothing', () => {
    noteValueWrite(null, join(ROOT, 'Notes/A.md'))
    noteValueWrite(ROOT, '/elsewhere/Notes/A.md')
    expect(flushValueWrites(ROOT)).toEqual([])
  })

  it('a note under another root drops what the old root held', () => {
    noteValueWrite(ROOT, join(ROOT, 'Notes/A.md'))
    noteValueWrite('/elsewhere', '/elsewhere/Notes/A.md')
    expect(flushValueWrites(ROOT)).toEqual([])
    expect(flushValueWrites('/elsewhere')).toEqual([{ rel: 'Notes', pageIds: [] }])
  })

  it('pageIdIndex without a tree is empty', () => {
    expect(pageIdIndex(null).size).toBe(0)
  })
})
