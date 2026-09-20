import { describe, expect, it } from 'vitest'
import {
  bannerMenuItems,
  iconFavoriteMenuItems,
  nexusIconMenuItems,
  titleMenuItems,
} from './identityMenus'

const shape = (items: { label: string; separatorBefore?: boolean }[]): string[] =>
  items.flatMap((i) => [...(i.separatorBefore ? ['—'] : []), i.label])

describe('the nexus icon menu', () => {
  it('leads with what the nexus holds and offers the other as an addition', () => {
    expect(shape(nexusIconMenuItems({ hasPhoto: false, hasGlyph: true }))).toEqual([
      'Edit Icon',
      'Add Photo',
      '—',
      'Reset Icon',
    ])
    expect(shape(nexusIconMenuItems({ hasPhoto: true, hasGlyph: false }))).toEqual([
      'Edit Photo',
      'Add Icon',
      '—',
      'Reset Photo',
    ])
  })

  it('offers both as additions on the seeded mark, and nothing to restore', () => {
    expect(shape(nexusIconMenuItems({ hasPhoto: false, hasGlyph: false }))).toEqual([
      'Add Icon',
      'Add Photo',
    ])
  })

  it('names the photo when a hand-written settings file carries both', () => {
    expect(shape(nexusIconMenuItems({ hasPhoto: true, hasGlyph: true }))).toEqual([
      'Edit Photo',
      'Edit Icon',
      '—',
      'Reset Photo',
    ])
  })
})

describe('the banner menu', () => {
  it('names its noun, and adds when there is nothing yet', () => {
    expect(bannerMenuItems({ add: true, noun: 'Cover' })).toEqual([
      { label: 'Add Cover', action: 'change' },
    ])
    expect(bannerMenuItems().map((i) => i.label)).toEqual([
      'Edit Banner',
      'Change Banner',
      'Remove Banner',
    ])
    expect(bannerMenuItems({ noRemove: true }).map((i) => i.label)).toEqual([
      'Edit Banner',
      'Change Banner',
    ])
  })
})

describe('the title menu', () => {
  it('offers Rename, Edit Icon unless withheld, and the icon toggle named for its state', () => {
    expect(titleMenuItems().map((i) => i.label)).toEqual(['Rename', 'Edit Icon'])
    expect(titleMenuItems({ toggleIcon: true, iconHidden: true, noEditIcon: true })).toEqual([
      { label: 'Rename', action: 'rename' },
      { label: 'Show Icon', action: 'toggleIcon' },
    ])
    expect(titleMenuItems({ toggleIcon: true }).at(-1)?.label).toBe('Hide Icon')
  })
})

describe('the icon favorite menu', () => {
  it('is one toggle named for its direction', () => {
    expect(iconFavoriteMenuItems(false)).toEqual([{ label: 'Favorite', action: 'toggle' }])
    expect(iconFavoriteMenuItems(true)[0].label).toBe('Remove from Favorites')
  })
})
