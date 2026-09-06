import { describe, expect, it } from 'vitest'
import type { TileEntry, PagePickerItem, ViewPickerItem } from '../Tiles/tiles'
import { tileMenuItems } from './TileHandleMenu'

type Ctx = Parameters<typeof tileMenuItems>[0]

const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  entry: { type: 'markdown', id: 'b1' } as unknown as TileEntry,
  pageItems: [],
  viewItems: [],
  containerLocked: false,
  ...over,
})

const labels = (m: ReturnType<typeof tileMenuItems>): string[] => m.items.map((i) => i.label)
const row = (m: ReturnType<typeof tileMenuItems>, label: string) =>
  m.items.find((i) => i.label === label)

describe('the tile menu as native rows', () => {
  it('offers the two link drills for a markdown tile, and Source for a page tile', () => {
    expect(labels(tileMenuItems(ctx()))).toContain('Link View')
    expect(labels(tileMenuItems(ctx()))).toContain('Link Page')
    const page = tileMenuItems(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap' },
      }),
    )
    expect(labels(page)).toContain('Source')
    expect(labels(page)).not.toContain('Link Page')
  })

  it('heads a page tile with its own name, inert — the title field has no native twin', () => {
    const m = tileMenuItems(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap' },
      }),
    )
    expect(m.items[0]).toMatchObject({ label: 'Roadmap', disabled: true })
  })

  it('marks the scale and style in force', () => {
    const m = tileMenuItems(ctx({ entry: { type: 'markdown', id: 'b1', zoom: 0.5 } as TileEntry }))
    const scale = row(m, 'Scale')?.submenu ?? []
    expect(scale.filter((r) => r.checked).map((r) => r.action)).toEqual(['tile:zoom:0.5'])
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
    const m = tileMenuItems(ctx({ viewItems: views, pageItems: pages }))
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
    const m = tileMenuItems(
      ctx({ entry: { type: 'markdown', id: 'b1', locked: true } as TileEntry }),
    )
    expect(row(m, 'Duplicate')?.disabled).toBe(true)
    expect(row(m, 'Delete')?.disabled).toBe(true)
    expect(row(m, 'Style')?.disabled).toBe(true)
    expect(labels(m)).toContain('Unlock')
  })

  it('shows a board lock as an inert Locked the tile cannot undo', () => {
    const m = tileMenuItems(ctx({ containerLocked: true }))
    expect(row(m, 'Locked')?.disabled).toBe(true)
  })

  it('refuses a drill with nothing in it, and opens no empty branch', () => {
    const r = row(tileMenuItems(ctx()), 'Link Page')
    expect(r?.disabled).toBe(true)
    expect(r?.submenu).toBeUndefined()
  })

  it('offers a view tile no link rows', () => {
    const m = tileMenuItems(ctx({ entry: { type: 'view', id: 'b1' } as unknown as TileEntry }))
    expect(row(m, 'Source')).toBeUndefined()
  })

  it('refuses a container holding nothing rather than branching into blank space', () => {
    const m = tileMenuItems(
      ctx({ pageItems: [{ label: 'Empty Collection', submenu: [] }] as PagePickerItem[] }),
    )
    const branch = row(m, 'Link Page')?.submenu?.[0]
    expect(branch).toMatchObject({ label: 'Empty Collection', disabled: true })
    expect(branch?.submenu).toBeUndefined()
  })
})
