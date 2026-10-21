import { describe, expect, it, vi } from 'vitest'
import type { SetNode } from '../../Nexus/tree'
import { makeTree } from '../../Testing/testTree'
import { subfieldCrumbs } from './crumbs'

const tree = makeTree()
const ideas = tree.collections[0]?.sets?.[0] as SetNode
const drafts: SetNode = {
  kind: 'set',
  id: 's2',
  title: 'Drafts',
  path: 'Notes/Ideas/Drafts',
  sets: [],
  pages: [{ kind: 'page', id: 'p3', title: 'Gamma', path: 'Notes/Ideas/Drafts/Gamma.md' }],
}
ideas.sets = [drafts]
const gamma = { kind: 'page', id: 'p3', path: 'Notes/Ideas/Drafts/Gamma.md' } as const

const navigableOf = (foldersOpen: boolean): boolean[] =>
  subfieldCrumbs(tree, gamma, null, () => {}, foldersOpen).map((c) => c.onSelect !== undefined)

describe('subfieldCrumbs', () => {
  it('a Sub-Set crumb up the spine is plain while folders stay closed', () => {
    expect(navigableOf(false)).toEqual([true, true, false, false])
  })

  it('a Sub-Set crumb up the spine navigates once folders open', () => {
    expect(navigableOf(true)).toEqual([true, true, true, false])
  })

  it('a ⌘-click on a crumb asks for a new tab, and a plain click does not', () => {
    const navigate = vi.fn()
    const [collection] = subfieldCrumbs(tree, gamma, null, navigate, false)
    collection?.onSelect?.({ metaKey: true, ctrlKey: true } as React.MouseEvent)
    collection?.onSelect?.({ metaKey: false, ctrlKey: false } as React.MouseEvent)
    expect(navigate.mock.calls.map((c) => c[2])).toEqual([true, false])
  })

  it("an archive's crumbs are its owner's ancestry, each navigable, then a plain Archive", () => {
    const crumbs = subfieldCrumbs(tree, { kind: 'archive', id: 's1' }, null, () => {}, false)
    expect(crumbs.map((c) => c.title)).toEqual(['Notes', 'Ideas', 'Archive'])
    expect(crumbs.map((c) => c.onSelect !== undefined)).toEqual([true, true, false])
  })
})
