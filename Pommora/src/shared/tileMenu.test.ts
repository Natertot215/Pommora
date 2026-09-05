import { describe, expect, it } from 'vitest'
import type { TileEntry, PagePickerItem, ViewPickerItem } from './tiles'
import { type TileMenuContext, tileMenuModel } from './tileMenu'

const STEPS = [
  { label: '1.00x', factor: 1 },
  { label: '0.50x', factor: 0.5 },
]

const ctx = (over: Partial<TileMenuContext> = {}): TileMenuContext => ({
  entry: { type: 'markdown', id: 'b1' } as unknown as TileEntry,
  pageItems: [],
  viewItems: [],
  zoomSteps: STEPS,
  currentFactor: 1,
  locked: false,
  containerLocked: false,
  ...over,
})

const labels = (m: ReturnType<typeof tileMenuModel>): string[] => m.items.map((i) => i.label)
const row = (m: ReturnType<typeof tileMenuModel>, label: string) =>
  m.items.find((i) => i.label === label)

describe('the tile menu as a model', () => {
  it('offers the two link drills for a markdown tile, and Source for a page tile', () => {
    expect(labels(tileMenuModel(ctx()))).toContain('Link View')
    expect(labels(tileMenuModel(ctx()))).toContain('Link Page')
    const page = tileMenuModel(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap' },
      }),
    )
    expect(labels(page)).toContain('Source')
    expect(labels(page)).not.toContain('Link Page')
  })

  it('heads a page tile with its own name, inert — the title field has no native twin', () => {
    const m = tileMenuModel(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap' },
      }),
    )
    expect(m.items[0]).toMatchObject({ label: 'Roadmap', disabled: true })
  })

  it('marks the scale and style in force', () => {
    const m = tileMenuModel(ctx({ currentFactor: 0.5 }))
    expect(row(m, 'Scale')?.submenu?.map((r) => [r.label, r.checked])).toEqual([
      ['1.00x', false],
      ['0.50x', true],
    ])
    expect(row(m, 'Style')?.submenu?.find((r) => r.checked)?.label).toBe('Bordered')
  })

  it('indexes drill picks so a view pick survives a menu row that can only carry a string', () => {
    const views: ViewPickerItem[] = [
      {
        label: 'Roadmap',
        submenu: [{ label: 'Board', pick: { source_id: 's1', view_id: 'v1' } }],
      },
    ]
    const pages: PagePickerItem[] = [{ label: 'Notes', pick: 'p9' }]
    const m = tileMenuModel(ctx({ viewItems: views, pageItems: pages }))
    const leaf = row(m, 'Link View')?.submenu?.[0].submenu?.[0]
    expect(leaf?.label).toBe('Board')
    expect(m.picks[Number(leaf?.action.slice(10))]).toEqual({
      kind: 'view',
      value: { source_id: 's1', view_id: 'v1' },
    })
    const pageLeaf = row(m, 'Link Page')?.submenu?.[0]
    expect(m.picks[Number(pageLeaf?.action.slice(10))]).toEqual({ kind: 'page', value: 'p9' })
  })

  it('refuses every act under a lock but still offers the menu', () => {
    const m = tileMenuModel(ctx({ locked: true }))
    expect(row(m, 'Duplicate')?.disabled).toBe(true)
    expect(row(m, 'Delete')?.disabled).toBe(true)
    expect(row(m, 'Style')?.disabled).toBe(true)
    expect(labels(m)).toContain('Unlock')
  })

  it('shows a board lock as an inert Locked the tile cannot undo', () => {
    const m = tileMenuModel(ctx({ locked: true, containerLocked: true }))
    expect(row(m, 'Locked')?.disabled).toBe(true)
  })

  it('refuses a drill with nothing in it, and opens no empty branch', () => {
    const r = row(tileMenuModel(ctx()), 'Link Page')
    expect(r?.disabled).toBe(true)
    expect(r?.submenu).toBeUndefined()
  })

  it('shows a view tile its Source, refused — the row is fixed, not absent', () => {
    const m = tileMenuModel(ctx({ entry: { type: 'view', id: 'b1' } as unknown as TileEntry }))
    expect(row(m, 'Source')).toMatchObject({ disabled: true })
    expect(row(m, 'Source')?.submenu).toBeUndefined()
  })

  it('refuses a container holding nothing rather than branching into blank space', () => {
    const m = tileMenuModel(
      ctx({ pageItems: [{ label: 'Empty Collection', submenu: [] }] as PagePickerItem[] }),
    )
    const branch = row(m, 'Link Page')?.submenu?.[0]
    expect(branch).toMatchObject({ label: 'Empty Collection', disabled: true })
    expect(branch?.submenu).toBeUndefined()
  })
})
