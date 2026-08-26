import { describe, expect, it } from 'vitest'
import { embedAreaMenuItems, embedTitleMenuItems, viewButtonMenuItems } from './viewMenus'

const labels = (rows: { label: string }[]): string[] => rows.map((r) => r.label)

describe('the view embed’s title menu', () => {
  it('offers Edit Icon only while an icon is shown', () => {
    expect(labels(embedTitleMenuItems(true, 2))).toContain('Edit Icon')
    expect(labels(embedTitleMenuItems(false, 2))).not.toContain('Edit Icon')
  })

  it('marks the heading level the title is at, out of the full six', () => {
    const sizes = embedTitleMenuItems(true, 3).find((r) => r.label === 'Title Size')?.submenu
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
})

describe('the view embed’s area menu', () => {
  // With the title row hidden, its own right-click target is gone — so this menu carries Show Title.
  it('offers Show Title only while the title row is hidden', () => {
    expect(labels(embedAreaMenuItems({ viewStyle: 'dropdown', titleShown: false }))).toContain(
      'Show Title',
    )
    expect(labels(embedAreaMenuItems({ viewStyle: 'dropdown', titleShown: true }))).not.toContain(
      'Show Title',
    )
  })

  it('marks the style in force on the Style submenu', () => {
    const style = embedAreaMenuItems({ viewStyle: 'toolbar', titleShown: true }).find(
      (r) => r.label === 'Style',
    )?.submenu
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
