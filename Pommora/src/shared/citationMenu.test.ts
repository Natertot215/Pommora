import { describe, expect, it } from 'vitest'
import { citationMenuModel } from './citationMenu'

const labels = (ctx: Parameters<typeof citationMenuModel>[0]): string[] =>
  citationMenuModel(ctx).map((r) => r.label)

describe('what a marker offers', () => {
  it('Edit, Copy and Delete — B-3, in that order', () => {
    expect(labels({ subject: 'marker', editable: true, lastReference: false })).toEqual([
      'Edit Footnote',
      'Copy Reference',
      'Delete Reference',
    ])
  })

  // The row says what the click will actually do: the last reference takes the footnote with it.
  it('the last reference names the footnote it will take with it', () => {
    expect(labels({ subject: 'marker', editable: true, lastReference: true })).toContain(
      'Delete Footnote',
    )
  })

  it('a read-only surface offers only what it can still do', () => {
    expect(labels({ subject: 'marker', editable: false })).toEqual(['Copy Reference'])
  })
})

describe('what a citation offers', () => {
  it('Copy and Delete — C-10, and no Edit, since the caret is already there', () => {
    expect(labels({ subject: 'citation', editable: true })).toEqual([
      'Copy Reference',
      'Delete Footnote',
    ])
  })

  it('a read-only surface offers only the copy', () => {
    expect(labels({ subject: 'citation', editable: false })).toEqual(['Copy Reference'])
  })
})

describe('the rows group themselves', () => {
  // Edit and Copy read the footnote; Delete removes it. One divider, and it stands above Delete.
  it('the only divider stands above Delete', () => {
    const dividers = (ctx: Parameters<typeof citationMenuModel>[0]): string[] =>
      citationMenuModel(ctx)
        .filter((r) => r.separatorBefore)
        .map((r) => r.label)
    expect(dividers({ subject: 'marker', editable: true, lastReference: false })).toEqual([
      'Delete Reference',
    ])
    expect(dividers({ subject: 'citation', editable: true })).toEqual(['Delete Footnote'])
    expect(dividers({ subject: 'marker', editable: false })).toEqual([])
  })

  it('no menu opens on a separator — a divider at the top separates nothing', () => {
    for (const ctx of [
      { subject: 'marker', editable: true },
      { subject: 'marker', editable: false },
      { subject: 'citation', editable: true },
      { subject: 'citation', editable: false },
    ] as const)
      expect(citationMenuModel(ctx)[0]?.separatorBefore ?? false, JSON.stringify(ctx)).toBe(false)
  })
})
