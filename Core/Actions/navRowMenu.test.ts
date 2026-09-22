import { describe, expect, it } from 'vitest'
import { type NavRowMenuContext, navRowMenuItems } from './navRowMenu'

const shape = (ctx: NavRowMenuContext): string[] =>
  navRowMenuItems(ctx).flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

const base: NavRowMenuContext = {
  canOpenNewTab: true,
  alreadyOpen: false,
  kind: 'page',
  isPinned: false,
  isFavorite: false,
}

describe('the nav row menu', () => {
  it('opens, sends, pins, favorites, and removes, each group divided', () => {
    expect(shape({ ...base, currentParentPath: 'Notes' })).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Copy Link',
      'Copy Path',
      '—',
      'View History',
      '—',
      'Pin',
      'Favorite',
      '—',
      'Remove',
    ])
  })

  it('a recent without a live path offers no send block', () => {
    expect(shape(base)).toEqual(['Preview', 'New Tab', '—', 'Pin', 'Favorite', '—', 'Remove'])
  })

  it('a container row without an opener starts at Pin', () => {
    expect(
      shape({
        ...base,
        canOpenNewTab: false,
        kind: 'collection',
        isPinned: true,
        isFavorite: true,
      }),
    ).toEqual(['Unpin', 'Unfavorite', '—', 'Remove'])
  })

  it('a Space row previews, and offers no send block', () => {
    expect(shape({ ...base, kind: 'space', currentParentPath: 'Notes' })).toEqual([
      'Preview',
      'New Tab',
      '—',
      'Pin',
      'Favorite',
      '—',
      'Remove',
    ])
  })

  it('reads Open on a row already open in a tab', () => {
    expect(navRowMenuItems({ ...base, alreadyOpen: true })[0].label).toBe('Open')
  })
})
