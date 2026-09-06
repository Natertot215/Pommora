import { describe, it, expect } from 'vitest'
import {
  destinationRows,
  pageLinkText,
  pageMetaMenuItems,
  pageMetaMenuSubset,
  pagePathText,
  pageSendActions,
} from './pageMenu'

describe('the page menu', () => {
  it('offers the copy, history, and reveal group only where it is asked for', () => {
    const bare = pageMetaMenuItems(false, { newPages: 'pair' }).map((i) => i.action)
    expect(bare).not.toContain('title:copylink')
    expect(bare).not.toContain('title:reveal')
    const full = pageMetaMenuItems(false, {
      window: true,
      newPages: 'pair',
      clipboard: true,
      history: true,
      reveal: true,
    })
    expect(full.map((i) => i.action)).toEqual([
      'title:window',
      'title:newtab',
      'title:rename',
      'title:icon',
      'title:newabove',
      'title:newbelow',
      'title:copylink',
      'title:copypath',
      'title:history',
      'title:reveal',
      'title:delete',
    ])
  })
  it('history opens its own group, and reveal joins it', () => {
    const items = pageMetaMenuItems(false, { clipboard: true, history: true, reveal: true })
    expect(items.find((i) => i.action === 'title:history')?.separatorBefore).toBe(true)
    expect(items.find((i) => i.action === 'title:reveal')?.separatorBefore).toBe(false)
  })
  it('reveal opens its own group when nothing copies before it', () => {
    const items = pageMetaMenuItems(false, { reveal: true })
    expect(items.find((i) => i.action === 'title:reveal')?.separatorBefore).toBe(true)
  })
  it('a surface that only points at a page reaches its link, its path, and its history', () => {
    expect(pageSendActions({})).toEqual(['title:copylink', 'title:copypath', 'title:history'])
  })

  it('a subset keeps the full menu order and drops a leading separator', () => {
    const items = pageMetaMenuSubset(['title:delete', 'title:rename', 'title:copylink'])
    expect(items.map((i) => i.action)).toEqual(['title:rename', 'title:copylink', 'title:delete'])
    expect(items[0].separatorBefore).toBeUndefined()
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
    const move = items.find((i) => i.action === 'title:moveto')
    expect(move?.submenu?.[0].submenu).toEqual([
      { label: 'Notes', action: 'move:Notes' },
      { label: 'Sub', action: 'move:Notes/Sub', disabled: true, separatorBefore: true },
    ])
    expect(
      pageMetaMenuItems(false, { move: { moveTargets: [] } }).some(
        (i) => i.action === 'title:moveto',
      ),
    ).toBe(false)
    expect(destinationRows([{ id: 'a', label: 'A', path: 'A' }], (t) => t.id)).toEqual([
      { label: 'A', action: 'a' },
    ])
  })

  it('copies a page as a connection, and as its location without the extension', () => {
    expect(pageLinkText('Weekly Review')).toBe('[[Weekly Review]]')
    expect(pagePathText('Collection A/Set Alpha/Page A.md')).toBe('Collection A/Set Alpha/Page A')
    expect(pagePathText('Notes/Read.MD')).toBe('Notes/Read')
  })
})
