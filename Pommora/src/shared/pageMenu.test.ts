import { describe, it, expect } from 'vitest'
import {
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

  it('copies a page as a connection, and as its location without the extension', () => {
    expect(pageLinkText('Weekly Review')).toBe('[[Weekly Review]]')
    expect(pagePathText('Collection A/Set Alpha/Page A.md')).toBe('Collection A/Set Alpha/Page A')
    expect(pagePathText('Notes/Read.MD')).toBe('Notes/Read')
  })
})
