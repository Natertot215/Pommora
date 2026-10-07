import { describe, it, expect } from 'vitest'
import type { ActionItem } from './menuModel'
import { destinationRows, pageMetaMenuItems, pageOpenRows, pageSendGroups } from './pageMenu'

const shape = (items: readonly ActionItem<string>[]): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the page menu', () => {
  it('groups its rows, with Reveal joining History only where it is asked for', () => {
    expect(
      shape(pageMetaMenuItems(false, { window: true, newPages: 'pair', reveal: true })),
    ).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Rename',
      'Edit Icon',
      '—',
      'New Page Above',
      'New Page Below',
      '—',
      'Copy Link',
      'Copy Path',
      '—',
      'View History',
      'Reveal Location',
      '—',
      'Delete',
    ])
    expect(pageMetaMenuItems(false).some((i) => i.action === 'title:reveal')).toBe(false)
  })

  it('a surface that only points at a page reaches its link, its path, and its history, Move To leading once it has destinations', () => {
    expect(pageSendGroups({}).map((g) => g.map((i) => i.label))).toEqual([
      ['Copy Link', 'Copy Path'],
      ['View History'],
    ])
    expect(
      pageSendGroups({ moveTargets: [{ id: 'c', label: 'Notes', path: 'Notes' }] })[0][0].label,
    ).toBe('Move To')
  })

  it('opens a page in the order its state reads, offering only the ways asked for', () => {
    expect(pageOpenRows({ window: true }).map((i) => i.label)).toEqual(['Preview', 'New Tab'])
    expect(pageOpenRows({ alreadyOpen: true, window: true }).map((i) => i.label)).toEqual([
      'Open',
      'Preview',
    ])
    expect(pageOpenRows({ newTab: false })).toEqual([])
  })

  it('Move To drills the destinations, a parent repeated as its own first row and the current home refused', () => {
    const items = pageMetaMenuItems(false, {
      move: {
        moveTargets: [
          {
            id: 'c',
            label: 'Notes',
            path: 'Notes',
            children: [{ id: 's', label: 'Sub', path: 'Notes/Sub' }],
          },
        ],
        currentParentPath: 'Notes/Sub',
      },
    })
    const move = items.find((i) => i.label === 'Move To')
    expect(move?.submenu?.[0].submenu).toEqual([
      { label: 'Notes', action: 'move:Notes' },
      { label: 'Sub', action: 'move:Notes/Sub', disabled: true, separatorBefore: true },
    ])
    expect(
      pageMetaMenuItems(false, { move: { moveTargets: [] } }).some((i) => i.label === 'Move To'),
    ).toBe(false)
    expect(destinationRows([{ id: 'a', label: 'A', path: 'A' }], (t) => t.id)).toEqual([
      { label: 'A', action: 'a' },
    ])
  })
})
