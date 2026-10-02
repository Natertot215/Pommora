// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type CreateRequest, DEFAULT_NEW_NAME, type MutateRequest } from '../Nexus/mutateRequest'
import type { SelectionState } from '../Navigation/navRef'
import type { Personalization } from '../Settings/personalization'
import { makeTree } from '../Testing/testTree'
import { useSession } from '../Session/store'
import { createNamed, newPage, newPageAdjacent, newSpaceAdjacent } from './createActions'

const CREATED = { path: 'Notes/Untitled.md' }
const asked: MutateRequest[] = []
const beginRename = vi.fn()
const askedId = (): string => (asked[0] as CreateRequest).id
const select = vi.fn()

function seed(
  selection: SelectionState,
  tree = makeTree(),
  personalization: Personalization = {},
): void {
  useSession.setState({
    tree: { ...tree, config: { ...tree.config, personalization } },
    selection,
    beginRename,
    select,
    mutate: async (req) => {
      asked.push(req)
      return { created: CREATED }
    },
  })
}

beforeEach(() => {
  asked.length = 0
  beginRename.mockClear()
  select.mockClear()
})

describe('newPage', () => {
  it('creates in the selected Set by its placement setting and opens the page in the current tab', async () => {
    seed({ kind: 'set', id: 's1', path: 'Notes/Ideas' }, makeTree(), { newPagePlacement: 'top' })
    await newPage(false)
    expect(asked).toEqual([
      {
        op: 'createPage',
        id: expect.any(String),
        parentPath: 'Notes/Ideas',
        name: DEFAULT_NEW_NAME,
        order: [askedId(), 'p2'],
      },
    ])
    expect(select).toHaveBeenCalledWith(
      { kind: 'page', id: askedId(), ...CREATED },
      { newTab: false },
    )
  })

  it("creates beside the selected page, in the page's own folder", async () => {
    seed({ kind: 'page', id: 'p2', path: 'Notes/Ideas/Beta.md' })
    await newPage(false)
    expect(asked).toMatchObject([{ parentPath: 'Notes/Ideas' }])
  })

  it('falls back to the first Collection, and creates nothing without one', async () => {
    seed({ kind: 'none' })
    await newPage(false)
    seed({ kind: 'set', id: 'gone', path: 'Notes/Gone' })
    await newPage(false)
    expect(asked).toMatchObject([{ parentPath: 'Notes' }, { parentPath: 'Notes' }])
    seed({ kind: 'none' }, { ...makeTree(), collections: [] })
    await newPage(false)
    expect(asked).toHaveLength(2)
  })

  it("from a window, creates beside the window's page and opens it as a window tab", async () => {
    seed({ kind: 'none' })
    const openWindowTab = vi.fn()
    const target = { kind: 'page' as const, id: 'p2', path: 'Notes/Ideas/Beta.md' }
    useSession.setState({
      openWindowTab,
      windowSlot: { kind: 'page', tabs: [{ id: 'w1', target }], activeTabId: 'w1' },
    })
    await newPage(true)
    expect(asked).toMatchObject([{ parentPath: 'Notes/Ideas' }])
    expect(openWindowTab).toHaveBeenCalledWith({ kind: 'page', id: askedId(), ...CREATED })
    expect(select).not.toHaveBeenCalled()
  })
})

describe('adjacent creates', () => {
  it('slots a page above its anchor and opens its name field on the declared host', async () => {
    const tree = makeTree()
    tree.collections[0].pages.push({
      kind: 'page',
      id: 'p3',
      title: 'Gamma',
      path: 'Notes/Gamma.md',
    })
    seed({ kind: 'none' }, tree)
    await newPageAdjacent('Notes/Gamma.md', 'above', 'sidebar')
    expect(asked).toMatchObject([
      { op: 'createPage', parentPath: 'Notes', order: ['p1', askedId(), 'p3'] },
    ])
    expect(beginRename).toHaveBeenCalledWith(CREATED.path, true, 'sidebar')
  })

  it('slots a Space below its anchor', async () => {
    seed({ kind: 'none' })
    await newSpaceAdjacent('a1', 'below')
    expect(asked).toMatchObject([
      {
        op: 'createSpace',
        contextId: 'g1',
        name: 'New Realm',
        order: ['a1', askedId(), 't1', 'pr1'],
      },
    ])
    expect(beginRename).toHaveBeenCalledWith(CREATED.path, true, undefined)
  })
})

describe('createNamed', () => {
  it("places the request by its kind's placement setting and opens its name field", async () => {
    seed({ kind: 'none' }, makeTree(), { newSpacePlacement: 'top' })
    await createNamed(
      { op: 'createSpace', id: 'sp9', contextId: 'g1', name: 'New Realm' },
      'matrix',
    )
    expect(asked).toEqual([
      {
        op: 'createSpace',
        id: 'sp9',
        contextId: 'g1',
        name: 'New Realm',
        order: ['sp9', 'a1', 't1', 'pr1'],
      },
    ])
    expect(beginRename).toHaveBeenCalledWith(CREATED.path, true, 'matrix')
  })
})
