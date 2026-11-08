import { describe, expect, it } from 'vitest'
import {
  embedAreaMenuItems,
  embedTitleMenuItems,
  viewButtonMenuItems,
  viewItemMenuItems,
  viewRowMenuItems,
} from './viewMenus'

const labels = (rows: { label: string }[]): string[] => rows.map((r) => r.label)

describe('the view embed’s title menu', () => {
  it('offers Edit Icon whether or not the icon is shown', () => {
    expect(labels(embedTitleMenuItems(true, 2, true))).toContain('Edit Icon')
    expect(labels(embedTitleMenuItems(false, 2, true))).toContain('Edit Icon')
  })

  it('marks the heading level the title is at, out of the full six', () => {
    const sizes = embedTitleMenuItems(true, 3, true).find((r) => r.label === 'Title Size')?.submenu
    expect(sizes?.map((r) => r.label)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
      'Heading 6',
    ])
    expect(sizes?.filter((r) => r.checked).map((r) => r.label)).toEqual(['Heading 3'])
  })

  it('sits the views toggle right below Hide Title, named after what pressing it does', () => {
    expect(labels(embedTitleMenuItems(true, 2, true)).slice(-2)).toEqual([
      'Hide Title',
      'Hide Views',
    ])
    expect(labels(embedTitleMenuItems(true, 2, false)).slice(-2)).toEqual([
      'Hide Title',
      'Show Views',
    ])
  })
})

describe('the view embed’s area menu', () => {
  it('offers Show Title only while the title row is hidden', () => {
    expect(
      labels(embedAreaMenuItems({ viewStyle: 'dropdown', titleShown: false, viewsShown: true })),
    ).toContain('Show Title')
    expect(
      labels(embedAreaMenuItems({ viewStyle: 'dropdown', titleShown: true, viewsShown: true })),
    ).not.toContain('Show Title')
  })

  it('names the views toggle after what pressing it does', () => {
    expect(
      labels(embedAreaMenuItems({ viewStyle: 'toolbar', titleShown: true, viewsShown: true })),
    ).toContain('Hide Views')
    expect(
      labels(embedAreaMenuItems({ viewStyle: 'toolbar', titleShown: true, viewsShown: false })),
    ).toContain('Show Views')
  })

  it('marks the style in force on the Style submenu', () => {
    const style = embedAreaMenuItems({
      viewStyle: 'toolbar',
      titleShown: true,
      viewsShown: true,
    }).find((r) => r.label === 'Style')?.submenu
    expect(style?.map((r) => [r.label, r.checked])).toEqual([
      ['Dropdown', false],
      ['Toolbar', true],
    ])
  })
})

describe('the view button’s menu', () => {
  it('names the title toggle after what pressing it does', () => {
    expect(labels(viewButtonMenuItems({ viewButton: 'labeled' }))).toContain('Hide Title')
    expect(labels(viewButtonMenuItems({ viewButton: 'icon' }))).toContain('Show Title')
  })
})

const rowLabels = (ctx: Parameters<typeof viewRowMenuItems>[0]): string[] =>
  labels(viewRowMenuItems(ctx))

describe('a saved view row’s menu', () => {
  it('offers the rows every host can perform', () => {
    expect(rowLabels({ deletable: true, duplicable: true })).toEqual([
      'Rename',
      'Edit Icon',
      'Edit Color',
      'Duplicate',
      'Delete',
    ])
  })

  it('names the titles toggle after what it does', () => {
    expect(rowLabels({ titlesShown: true, deletable: true, duplicable: true })).toContain(
      'Hide Titles',
    )
    expect(rowLabels({ titlesShown: false, deletable: true, duplicable: true })).toContain(
      'Show Titles',
    )
  })

  it('separates the rows that make and unmake a view from those that edit one', () => {
    const rows = viewRowMenuItems({ deletable: true, duplicable: true })
    expect(rows.filter((r) => r.separatorBefore).map((r) => r.action)).toEqual(['duplicate'])
  })

  it('keeps Delete on a container’s last view, refused rather than absent', () => {
    const last = viewRowMenuItems({ deletable: false, duplicable: true }).find(
      (r) => r.action === 'delete',
    )
    expect(last?.disabled).toBe(true)
    expect(
      viewRowMenuItems({ deletable: true, duplicable: true }).find((r) => r.action === 'delete')
        ?.disabled,
    ).toBe(false)
  })

  it('keeps Duplicate on a row with no stored view, refused rather than absent', () => {
    const row = viewRowMenuItems({ deletable: false, duplicable: false }).find(
      (r) => r.action === 'duplicate',
    )
    expect(row?.disabled).toBe(true)
  })
})

describe('the view editor’s ⋮ menu', () => {
  it('offers Duplicate and Delete with their glyphs', () => {
    expect(
      viewItemMenuItems({ deletable: true, duplicable: true }).map((r) => [r.label, r.icon]),
    ).toEqual([
      ['Duplicate', 'copy'],
      ['Delete', 'trash'],
    ])
  })

  it('refuses rather than drops what the view can’t do', () => {
    const rows = viewItemMenuItems({ deletable: false, duplicable: false })
    expect(rows.map((r) => [r.action, r.disabled])).toEqual([
      ['duplicate', true],
      ['delete', true],
    ])
  })

  it('separates Delete from Duplicate, with nothing before Duplicate', () => {
    const rows = viewItemMenuItems({ deletable: true, duplicable: true })
    expect(rows.map((r) => r.separatorBefore === true)).toEqual([false, true])
  })
})
