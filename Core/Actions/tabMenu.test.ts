import { describe, expect, it } from 'vitest'
import { bannerMenuItems } from './identityMenus'
import { tabMenuItems } from './tabMenu'

const shape = (items: ReturnType<typeof tabMenuItems>): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the tab menu', () => {
  it('offers a page tab its window, the send block, Pin, and Close, each in its own group', () => {
    expect(
      shape(
        tabMenuItems({
          row: 'main',
          kind: 'page',
          pinned: false,
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
      row: 'main',
      kind: 'page',
      pinned: false,
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
    expect(shape(tabMenuItems({ row: 'main', kind: 'collection', pinned: true }))).toEqual([
      'Open',
      '—',
      'Unpin',
    ])
    expect(shape(tabMenuItems({ row: 'main', kind: 'collection', pinned: false }))).toEqual([
      'Pin',
      '—',
      'Close',
    ])
  })

  it('greys the rows that cannot act — the active tab, and a Matrix already previewed', () => {
    const onActive = tabMenuItems({ row: 'main', kind: 'collection', pinned: true, active: true })
    expect(onActive.find((i) => i.action === 'open')?.disabled).toBe(true)
    const previewed = tabMenuItems({
      row: 'main',
      kind: 'matrix',
      pinned: true,
      matrixWindowOpen: true,
    })
    expect(previewed.find((i) => i.action === 'window')?.disabled).toBe(true)
    const page = tabMenuItems({ row: 'main', kind: 'page', pinned: true, moveTargets: [] })
    expect(page.find((i) => i.action === 'window')?.disabled).toBeFalsy()
  })

  it('a target that also stands in a window offers Preview under Open', () => {
    expect(shape(tabMenuItems({ row: 'main', kind: 'matrix', pinned: true }))).toEqual([
      'Open',
      'Preview',
      '—',
      'Unpin',
    ])
    expect(shape(tabMenuItems({ row: 'main', kind: 'matrix', pinned: false }))).toEqual([
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
          row: 'main',
          kind: 'page',
          pinned: true,
          moveTargets: [],
        }),
      ),
    ).toEqual(['Open', 'Preview', '—', 'Copy Link', 'Copy Path', '—', 'View History', '—', 'Unpin'])
  })

  it('the NavView tab can only close', () => {
    expect(shape(tabMenuItems({ row: 'main', kind: 'newtab', pinned: false }))).toEqual(['Close'])
  })
})

describe('the window strip menu', () => {
  it('promotes, sends, and closes a Page tab, without Pin', () => {
    expect(shape(tabMenuItems({ row: 'window', kind: 'page', moveTargets: [] }))).toEqual([
      'Open In New Tab',
      '—',
      'Copy Link',
      'Copy Path',
      '—',
      'View History',
      '—',
      'Close',
    ])
  })

  it('a Space tab promotes and closes, and nothing else', () => {
    expect(shape(tabMenuItems({ row: 'window', kind: 'space' }))).toEqual([
      'Open In New Tab',
      '—',
      'Close',
    ])
  })

  it('seats the banner group between the send block and Close', () => {
    expect(
      shape(tabMenuItems({ row: 'window', kind: 'space', banner: bannerMenuItems({ add: true }) })),
    ).toEqual(['Open In New Tab', '—', 'Add Banner', '—', 'Close'])
  })

  it('a main-bar Space tab previews', () => {
    expect(shape(tabMenuItems({ row: 'main', kind: 'space', pinned: false }))).toEqual([
      'Preview',
      '—',
      'Pin',
      '—',
      'Close',
    ])
  })
})
