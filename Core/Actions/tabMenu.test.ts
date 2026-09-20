import { describe, expect, it } from 'vitest'
import { tabMenuItems } from './tabMenu'

const shape = (items: ReturnType<typeof tabMenuItems>): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the tab menu', () => {
  it('offers a page tab its window, the send block, Pin, and Close, each in its own group', () => {
    expect(
      shape(
        tabMenuItems({
          pinned: false,
          isNewTab: false,
          isPage: true,
          previews: true,
          moveTargets: [],
        }),
      ),
    ).toEqual([
      'Preview',
      '—',
      'Copy Link',
      'Copy Path',
      '—',
      'View History',
      '—',
      'Pin',
      '—',
      'Close',
    ])
  })

  it('leads the send block with Move To once the tab is given destinations', () => {
    const items = tabMenuItems({
      pinned: false,
      isNewTab: false,
      isPage: true,
      previews: true,
      moveTargets: [{ id: 'c', label: 'Notes', path: 'Notes' }],
      currentParentPath: 'Notes',
    })
    const move = items.find((i) => i.action === 'title:moveto')
    expect(move?.submenu?.[0]).toMatchObject({
      label: 'Notes',
      action: 'move:Notes',
      disabled: true,
    })
  })

  it('a pinned tab leads with the way into the pane, which an unpinned one already is', () => {
    expect(shape(tabMenuItems({ pinned: true, isNewTab: false }))).toEqual(['Open', '—', 'Unpin'])
    expect(shape(tabMenuItems({ pinned: false, isNewTab: false }))).toEqual(['Pin', '—', 'Close'])
  })

  it('a target that also stands in a window offers Preview under Open', () => {
    expect(shape(tabMenuItems({ pinned: true, isNewTab: false, previews: true }))).toEqual([
      'Open',
      'Preview',
      '—',
      'Unpin',
    ])
    expect(shape(tabMenuItems({ pinned: false, isNewTab: false, previews: true }))).toEqual([
      'Preview',
      '—',
      'Pin',
      '—',
      'Close',
    ])
  })

  it('a pinned page keeps its send block between Preview and Unpin', () => {
    expect(
      shape(
        tabMenuItems({
          pinned: true,
          isNewTab: false,
          isPage: true,
          previews: true,
          moveTargets: [],
        }),
      ),
    ).toEqual(['Open', 'Preview', '—', 'Copy Link', 'Copy Path', '—', 'View History', '—', 'Unpin'])
  })

  it('the NavView tab can only close', () => {
    expect(shape(tabMenuItems({ pinned: false, isNewTab: true }))).toEqual(['Close'])
  })
})
