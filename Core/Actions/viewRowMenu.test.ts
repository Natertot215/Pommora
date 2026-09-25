import { describe, it, expect } from 'vitest'
import { viewRowMenuItems } from './viewRowMenu'

const labels = (ctx: Parameters<typeof viewRowMenuItems>[0]): string[] =>
  viewRowMenuItems(ctx).map((r) => r.label)

describe('a saved view row’s menu', () => {
  it('offers the rows every host can perform', () => {
    expect(labels({ deletable: true, duplicable: true })).toEqual([
      'Rename',
      'Edit Icon',
      'Edit Color',
      'Duplicate',
      'Delete',
    ])
  })

  it('names the titles toggle after what it does', () => {
    expect(labels({ titlesShown: true, deletable: true, duplicable: true })).toContain(
      'Hide Titles',
    )
    expect(labels({ titlesShown: false, deletable: true, duplicable: true })).toContain(
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
