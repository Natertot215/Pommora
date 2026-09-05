import { describe, expect, it } from 'vitest'
import {
  coerceTileHost,
  knownTile,
  rawLayoutSchema,
  TILE_KINDS,
  type TileType,
  tilePatchProblem,
} from './tiles'

describe('knownTile', () => {
  it('types the three known entry kinds', () => {
    expect(knownTile({ id: 'a', type: 'markdown' })).toEqual({ id: 'a', type: 'markdown' })
    expect(knownTile({ id: 'b', type: 'page', page_id: 'p1' })).toMatchObject({
      type: 'page',
      page_id: 'p1',
    })
    expect(
      knownTile({ id: 'c', type: 'view', views: [{ source_id: 's1', config: { id: 'v' } }] }),
    ).toMatchObject({
      type: 'view',
      views: [{ source_id: 's1' }],
    })
  })

  it('keeps foreign keys on a known entry (loose) — including inside view elements', () => {
    expect(knownTile({ id: 'a', type: 'markdown', future_field: 1 })).toMatchObject({
      future_field: 1,
    })
    expect(
      knownTile({
        id: 'c',
        type: 'view',
        views: [{ source_id: 's1', config: {}, outside_key: true }],
      }),
    ).toMatchObject({ views: [{ outside_key: true }] })
  })

  it('a view entry needs a non-empty views list; a bad active index degrades, not rejects', () => {
    expect(knownTile({ id: 'c', type: 'view', views: [] })).toBeNull()
    expect(knownTile({ id: 'c', type: 'view' })).toBeNull()
    expect(
      knownTile({ id: 'c', type: 'view', views: [{ source_id: 's1' }], active: -2 }),
    ).toMatchObject({
      type: 'view',
      active: undefined,
    })
  })

  it('view chrome keys ride through; malformed ones degrade, not reject', () => {
    expect(
      knownTile({
        id: 'c',
        type: 'view',
        views: [{ source_id: 's1' }],
        title: false,
        icon: false,
        view_button: 'icon',
        view_style: 'dropdown',
      }),
    ).toMatchObject({ title: false, icon: false, view_button: 'icon', view_style: 'dropdown' })
    expect(
      knownTile({
        id: 'c',
        type: 'view',
        views: [{ source_id: 's1' }],
        view_button: 'huge',
        view_style: 7,
        title: 'yes',
      }),
    ).toMatchObject({
      type: 'view',
      view_button: undefined,
      view_style: undefined,
      title: undefined,
    })
  })

  it('title_level accepts 1–6 and degrades out-of-range / non-int', () => {
    expect(
      knownTile({ id: 'c', type: 'view', views: [{ source_id: 's1' }], title_level: 2 }),
    ).toMatchObject({ title_level: 2 })
    expect(
      knownTile({ id: 'c', type: 'view', views: [{ source_id: 's1' }], title_level: 9 }),
    ).toMatchObject({ title_level: undefined })
    expect(
      knownTile({ id: 'c', type: 'view', views: [{ source_id: 's1' }], title_level: 2.5 }),
    ).toMatchObject({ title_level: undefined })
  })

  it('returns null for unknown types and garbage — the caller renders inert', () => {
    expect(knownTile({ id: 'x', type: 'widget' })).toBeNull()
    expect(knownTile({ type: 'page', page_id: 'p1' })).toBeNull()
    expect(knownTile('nope')).toBeNull()
    expect(knownTile(null)).toBeNull()
  })
})

describe('rawLayoutSchema', () => {
  it('accepts a wire-shaped tree and rejects garbage', () => {
    const tree = {
      bands: [
        {
          node: {
            kind: 'row',
            ratios: [0.5, 0.5],
            children: [
              { kind: 'tile', id: 'a', h: 100 },
              {
                kind: 'column',
                children: [
                  { kind: 'tile', id: 'b', h: 40 },
                  { kind: 'tile', id: 'c', h: 40 },
                ],
              },
            ],
          },
        },
      ],
    }
    expect(rawLayoutSchema.safeParse(tree).success).toBe(true)
    expect(rawLayoutSchema.safeParse({ bands: 'no' }).success).toBe(false)
    const split = (node: unknown) => rawLayoutSchema.safeParse({ bands: [{ node }] }).success
    expect(split({ kind: 'column', children: [{ kind: 'tile', id: 'b', h: 40 }] })).toBe(false)
    expect(
      split({
        kind: 'row',
        ratios: [0.5, 0.5],
        children: [
          { kind: 'tile', id: 'a', h: 1 },
          { kind: 'tile', id: 'b', h: 1 },
          { kind: 'tile', id: 'c', h: 1 },
        ],
      }),
    ).toBe(false)
  })
})

describe('tilePatchProblem', () => {
  it('passes well-shaped patches and names the malformed ones', () => {
    expect(tilePatchProblem({ layout: { bands: [] } })).toBeNull()
    expect(tilePatchProblem({ tiles: [], locked: true })).toBeNull()
    expect(tilePatchProblem({ layout: 'garbage' })).toBe('Malformed layout.')
    expect(tilePatchProblem({ tiles: 'no' as unknown as unknown[] })).toBe(
      'tiles must be an array.',
    )
    expect(tilePatchProblem({ locked: 'yes' as unknown as boolean })).toBe(
      'locked must be a boolean.',
    )
  })
})

describe('coerceTileHost', () => {
  it('accepts the homepage host and rejects the rest', () => {
    expect(coerceTileHost({ kind: 'homepage' })).toEqual({ kind: 'homepage' })
    expect(coerceTileHost({ kind: 'area', path: 'x' })).toBeNull()
    expect(coerceTileHost('homepage')).toBeNull()
  })
})

describe('tile entry zoom field', () => {
  it('round-trips a numeric zoom on a page entry', () => {
    expect(knownTile({ id: 'b', type: 'page', page_id: 'p1', zoom: 1.25 })?.zoom).toBe(1.25)
  })

  it('drops a non-numeric zoom to undefined without failing the entry (E-1 foreign-data guard)', () => {
    const e = knownTile({ id: 'c', type: 'markdown', zoom: 'big' })
    expect(e).not.toBeNull()
    expect(e?.zoom).toBeUndefined()
  })
})

describe('the tile recipe', () => {
  it('declares every kind once, with its file rule and its menu rows', () => {
    const kinds: TileType[] = ['markdown', 'page', 'view']
    for (const k of kinds)
      expect(TILE_KINDS[k].schema.safeParse({ id: 'x', type: k }).success).toBe(k === 'markdown')
    expect(TILE_KINDS.markdown.fileBacked).toBe(true)
    expect(TILE_KINDS.page.fileBacked).toBe(false)
    expect(TILE_KINDS.view.fileBacked).toBe(false)
    expect(TILE_KINDS.markdown.menuRows).toEqual([
      { label: 'Link View', source: 'views' },
      { label: 'Link Page', source: 'pages' },
    ])
    expect(TILE_KINDS.page.menuRows).toEqual([{ label: 'Source', source: 'pages' }])
    expect(TILE_KINDS.view.menuRows).toEqual([])
    expect(knownTile({ id: 'x', type: 'widget' })).toBeNull()
  })
})
