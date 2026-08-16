import { describe, it, expect } from 'vitest'
import { viewRowMenuItems } from './viewRowMenu'

const labels = (ctx: Parameters<typeof viewRowMenuItems>[0]): string[] =>
  viewRowMenuItems(ctx).map((r) => r.label)

describe('a saved view row’s menu', () => {
  it('offers only what the host can perform', () => {
    expect(labels({ deletable: true })).toEqual(['Rename', 'Edit Icon', 'Delete'])
  })

  it('adds the colour row where a picker exists to open', () => {
    expect(labels({ colorable: true, deletable: true })).toEqual([
      'Rename',
      'Edit Icon',
      'Edit Color',
      'Delete',
    ])
  })

  // The titles toggle belongs to the embed's own chrome, and its label reads the state it will leave.
  it('names the titles toggle after what it does', () => {
    expect(labels({ titlesShown: true, deletable: true })).toContain('Hide Titles')
    expect(labels({ titlesShown: false, deletable: true })).toContain('Show Titles')
  })

  it('separates Delete from the rows that edit a view you are keeping', () => {
    const rows = viewRowMenuItems({ colorable: true, deletable: true })
    expect(rows.filter((r) => r.separatorBefore).map((r) => r.action)).toEqual(['delete'])
  })

  // Refused rather than absent: a container always has a view, and the row says why it can't go.
  it('keeps Delete on a container’s last view, refused rather than absent', () => {
    const last = viewRowMenuItems({ deletable: false }).find((r) => r.action === 'delete')
    expect(last?.disabled).toBe(true)
    expect(viewRowMenuItems({ deletable: true }).find((r) => r.action === 'delete')?.disabled).toBe(
      false,
    )
  })
})
