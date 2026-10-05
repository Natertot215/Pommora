import { describe, expect, it } from 'vitest'
import type { PickItem } from '../Actions/menuModel'
import type { PickKind, TileEntry, ViewPick } from '../Tiles/tiles'
import { makeTree } from '../Testing/testTree'
import { menuPatch, pickTreesOf, tileMenuItems } from './tileHandleMenu'

type Ctx = Parameters<typeof tileMenuItems>[0]
type Over = Partial<Omit<Ctx, 'pickTree'>> & {
  pages?: PickItem<string>[]
  views?: PickItem<ViewPick>[]
}

const ctx = ({ pages = [], views = [], ...over }: Over = {}): Ctx => ({
  entry: { type: 'markdown', id: 'b1' } as unknown as TileEntry,
  pickTree: ((kind: PickKind) => (kind === 'page' ? pages : views)) as Ctx['pickTree'],
  boardLocked: false,
  ...over,
})

const labels = (m: ReturnType<typeof tileMenuItems>): string[] => m.items.map((i) => i.label)
const row = (m: ReturnType<typeof tileMenuItems>, label: string) =>
  m.items.find((i) => i.label === label)

describe('the tile menu model both renderers draw', () => {
  it('offers the two link drills for a markdown tile, and Source for a page tile', () => {
    expect(labels(tileMenuItems(ctx()))).toContain('Link View')
    expect(labels(tileMenuItems(ctx()))).toContain('Link Page')
    const page = tileMenuItems(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap', icon: 'file' },
      }),
    )
    expect(labels(page)).toContain('Source')
    expect(labels(page)).not.toContain('Link Page')
  })

  it('heads a page tile with its own name and icon, live, so the row opens the page', () => {
    const m = tileMenuItems(
      ctx({
        entry: { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry,
        pageInfo: { title: 'Roadmap', icon: 'file' },
      }),
    )
    expect(m.items[0]).toMatchObject({ label: 'Roadmap', icon: 'file', action: 'tile:open' })
    expect(m.items[0].disabled).toBeFalsy()
  })

  it('marks the scale and style in force', () => {
    const m = tileMenuItems(ctx({ entry: { type: 'markdown', id: 'b1', zoom: 0.5 } as TileEntry }))
    const scale = row(m, 'Scale')?.submenu ?? []
    expect(scale.filter((r) => r.checked).map((r) => r.action)).toEqual(['tile:zoom:0.5'])
    expect(row(m, 'Style')?.submenu?.find((r) => r.checked)?.label).toBe('Bordered')
  })

  it('holds the pane open on the rows that change the tile in place', () => {
    const m = tileMenuItems(ctx())
    expect(row(m, 'Lock')).toMatchObject({ icon: 'lock-outline', stay: true })
    expect(row(m, 'Style')?.submenu?.every((r) => r.stay)).toBe(true)
    expect(row(m, 'Scale')?.submenu?.every((r) => r.stay)).toBe(true)
    const locked = tileMenuItems(
      ctx({ entry: { type: 'markdown', id: 'b1', locked: true } as TileEntry }),
    )
    expect(row(locked, 'Unlock')?.icon).toBe('locked')
  })

  it('indexes drill picks so a view pick survives a menu row that can only carry a string', () => {
    const views: PickItem<ViewPick>[] = [
      {
        label: 'Roadmap',
        submenu: [{ label: 'Board', pick: { source_id: 's1', view_id: 'v1' } }],
      },
    ]
    const pages: PickItem<string>[] = [{ label: 'Notes', pick: 'p9' }]
    const m = tileMenuItems(ctx({ views, pages }))
    const leaf = row(m, 'Link View')?.submenu?.[0].submenu?.[0]
    expect(leaf?.label).toBe('Board')
    expect(m.picks[Number(leaf?.action?.slice(10))]).toEqual({
      kind: 'view',
      value: { source_id: 's1', view_id: 'v1' },
    })
    const pageLeaf = row(m, 'Link Page')?.submenu?.[0]
    expect(m.picks[Number(pageLeaf?.action?.slice(10))]).toEqual({ kind: 'page', value: 'p9' })
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
    const m = tileMenuItems(ctx({ boardLocked: true }))
    expect(row(m, 'Locked')?.disabled).toBe(true)
  })

  it('leaves a drill with nothing in it an empty branch, which both renderers grey out', () => {
    expect(row(tileMenuItems(ctx()), 'Link Page')?.submenu).toEqual([])
  })

  it('offers a view tile no link rows', () => {
    const m = tileMenuItems(ctx({ entry: { type: 'view', id: 'b1' } as unknown as TileEntry }))
    expect(row(m, 'Source')).toBeUndefined()
  })

  it('leaves a container holding nothing an empty branch, which both renderers grey out', () => {
    const m = tileMenuItems(ctx({ pages: [{ label: 'Empty Collection', submenu: [] }] }))
    expect(row(m, 'Link Page')?.submenu?.[0]).toMatchObject({
      label: 'Empty Collection',
      submenu: [],
    })
  })

  it('sinks a footer node to a separated last row of its level', () => {
    const views: PickItem<ViewPick>[] = [
      {
        label: 'Roadmap',
        submenu: [
          { label: '+ Custom', pick: { source_id: 's1' }, footer: true },
          { label: 'Board', pick: { source_id: 's1', view_id: 'v1' } },
        ],
      },
    ]
    const level = row(tileMenuItems(ctx({ views })), 'Link View')?.submenu?.[0].submenu
    expect(level?.map((r) => r.label)).toEqual(['Board', '+ Custom'])
    expect(level?.[1].separatorBefore).toBe(true)
    expect(level?.[0].separatorBefore).toBeFalsy()
  })

  it('leaves a level of footers alone with nothing to separate it from', () => {
    const views: PickItem<ViewPick>[] = [
      {
        label: 'Roadmap',
        submenu: [{ label: '+ Custom', pick: { source_id: 's1' }, footer: true }],
      },
    ]
    const level = row(tileMenuItems(ctx({ views })), 'Link View')?.submenu?.[0].submenu
    expect(level?.map((r) => r.label)).toEqual(['+ Custom'])
    expect(level?.[0].separatorBefore).toBeFalsy()
  })

  it('asks only for the trees its rows name, none under a lock, and builds each once per menu', () => {
    const asked: PickKind[] = []
    const pickTree = ((kind: PickKind) => {
      asked.push(kind)
      return []
    }) as Ctx['pickTree']
    const page = { type: 'page', page_id: 'p1', id: 'b1' } as unknown as TileEntry
    tileMenuItems({ ...ctx({ entry: page }), pickTree })
    tileMenuItems({ ...ctx({ entry: { type: 'markdown', id: 'b1', locked: true } }), pickTree })
    expect(asked).toEqual(['page'])
    const trees = pickTreesOf(makeTree(), undefined)
    expect(trees('view')).toBe(trees('view'))
  })

  it('reaches the views of a Set nested inside another Set', () => {
    const tree = makeTree()
    const ideas = tree.collections[0].sets[0]
    ideas.sets = [
      {
        kind: 'set',
        id: 's2',
        title: 'Deep',
        path: 'Notes/Ideas/Deep',
        pages: [],
        views: [{ id: 'v1', name: 'Board', type: 'table' } as never],
      },
    ]
    const deep = pickTreesOf(tree, undefined)('view')[0].submenu?.[0].submenu?.[0]
    expect(deep?.label).toBe('Deep')
    expect(deep?.submenu?.map((n) => n.pick)).toEqual([
      { source_id: 's2', view_id: 'v1' },
      { source_id: 's2' },
    ])
  })
})

describe('the menu of a box with no entry this build draws', () => {
  it('offers Delete alone, held by the board lock', () => {
    expect(tileMenuItems(ctx({ entry: undefined })).items).toEqual([
      { label: 'Delete', icon: 'x', action: 'tile:delete', disabled: false },
    ])
    expect(
      row(tileMenuItems(ctx({ entry: undefined, boardLocked: true })), 'Delete')?.disabled,
    ).toBe(true)
  })
})

describe('the patch a settings pick writes', () => {
  const entry = { type: 'markdown', id: 'b1' } as unknown as TileEntry
  it('writes the picked setting, and deletes a key the pick returns to its default', () => {
    expect(menuPatch('tile:zoom:1.2', entry)).toEqual({ zoom: 1.2 })
    expect(menuPatch('tile:zoom:1', entry)).toEqual({ zoom: null })
    expect(menuPatch('tile:style:borderless', entry)).toEqual({ style: 'borderless' })
    expect(menuPatch('tile:lock', entry)).toEqual({ locked: true })
    expect(menuPatch('tile:lock', { ...entry, locked: true })).toEqual({ locked: null })
    expect(menuPatch('tile:duplicate', entry)).toBeNull()
  })
})
