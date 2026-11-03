import { describe, it, expect } from 'vitest'
import type { ActionItem } from './menuModel'
import {
  destinationRows,
  PAGE_ACTION_ROWS,
  pageMenuItems,
  pageOpenRows,
  pageSendGroups,
} from './pageMenu'

const shape = (items: readonly ActionItem<string>[]): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the page menu', () => {
  it('groups its rows, Preview leading and Reveal joining History', () => {
    expect(shape(pageMenuItems({ newPages: 'pair' }))).toEqual([
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
      'Archive',
      'Delete',
    ])
  })

  it('a grid offers one New Page, taking the Below path', () => {
    expect(
      pageMenuItems({ newPages: 'single' }).filter((i) => i.label.startsWith('New Page')),
    ).toEqual([{ label: 'New Page', action: 'title:newbelow', separatorBefore: true }])
  })

  it('an open page reads "Open" ahead of Preview', () => {
    expect(
      pageMenuItems({ alreadyOpen: true })
        .slice(0, 2)
        .map((i) => i.label),
    ).toEqual(['Open', 'Preview'])
  })

  it('leads with Edit Image only when the image is editable', () => {
    expect(pageMenuItems({}).some((i) => i.action === 'image:edit')).toBe(false)
    expect(pageMenuItems({ editImage: true })[0]).toEqual({
      label: 'Edit Image',
      action: 'image:edit',
    })
  })

  it('carries the metadata branches after Edit Icon', () => {
    const items = pageMenuItems({
      metadata: [
        { label: 'Spaces', submenu: [] },
        { label: 'Properties', submenu: [] },
      ],
    })
    const at = items.findIndex((i) => i.label === 'Edit Icon')
    expect(items.slice(at + 1, at + 3).map((i) => i.label)).toEqual(['Spaces', 'Properties'])
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
    const items = pageMenuItems({
      moveTargets: [
        {
          id: 'c',
          label: 'Notes',
          path: 'Notes',
          children: [{ id: 's', label: 'Sub', path: 'Notes/Sub' }],
        },
      ],
      currentParentPath: 'Notes/Sub',
    })
    const move = items.find((i) => i.label === 'Move To')
    expect(move?.submenu?.[0].submenu).toEqual([
      { label: 'Notes', action: 'move:Notes' },
      { label: 'Sub', action: 'move:Notes/Sub', disabled: true, separatorBefore: true },
    ])
    expect(pageMenuItems({ moveTargets: [] }).some((i) => i.label === 'Move To')).toBe(false)
    expect(destinationRows([{ id: 'a', label: 'A', path: 'A' }], (t) => t.id)).toEqual([
      { label: 'A', action: 'a' },
    ])
  })
})

describe('the page action rows', () => {
  it('hold Rename, the send and locate rows as one group without Move To, and Archive above Delete', () => {
    expect(shape(PAGE_ACTION_ROWS)).toEqual([
      'Rename',
      '—',
      'Copy Link',
      'Copy Path',
      'View History',
      'Reveal Location',
      '—',
      'Archive',
      'Delete',
    ])
  })
})
