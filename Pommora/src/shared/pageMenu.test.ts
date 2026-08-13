import { describe, it, expect } from 'vitest'
import { pageLinkText, pageMetaMenuItems, pageMetaMenuSubset, pagePathText } from './pageMenu'

describe('the page menu', () => {
  it('offers the copy and reveal group only where it is asked for', () => {
    const bare = pageMetaMenuItems(false, { newPages: 'pair' }).map((i) => i.action)
    expect(bare).not.toContain('title:copylink')
    expect(bare).not.toContain('title:reveal')
    const full = pageMetaMenuItems(false, {
      preview: true,
      newPages: 'pair',
      clipboard: true,
      reveal: true,
    }).map((i) => i.action)
    expect(full).toEqual([
      'title:preview',
      'title:newtab',
      'title:rename',
      'title:icon',
      'title:newabove',
      'title:newbelow',
      'title:copylink',
      'title:copypath',
      'title:reveal',
      'title:delete',
    ])
  })
  it('reveal opens its own group when nothing copies before it', () => {
    const items = pageMetaMenuItems(false, { reveal: true })
    expect(items.find((i) => i.action === 'title:reveal')?.separatorBefore).toBe(true)
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
