import { describe, expect, it } from 'vitest'
import { tabMenuItems } from './tabMenu'

const shape = (items: ReturnType<typeof tabMenuItems>): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the tab menu', () => {
  it('offers a page tab its window, the send block, Pin, and Close, each in its own group', () => {
    expect(
      shape(tabMenuItems({ pinned: false, isNewTab: false, isPage: true, moveTargets: [] })),
    ).toEqual([
      'Open Preview',
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

  it('a pinned tab offers Unpin alone after the send block', () => {
    expect(shape(tabMenuItems({ pinned: true, isNewTab: false }))).toEqual(['Unpin'])
    expect(shape(tabMenuItems({ pinned: false, isNewTab: false }))).toEqual(['Pin', '—', 'Close'])
  })

  it('the NavView tab can only close', () => {
    expect(shape(tabMenuItems({ pinned: false, isNewTab: true }))).toEqual(['Close'])
  })
})
