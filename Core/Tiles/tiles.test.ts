import { describe, expect, it } from 'vitest'
import { fault, ok } from '../Contract/result'
import { tileId } from '../Testing/tileLayouts'
import {
  coerceTileHost,
  copyEntry,
  knownTile,
  rawLayoutSchema,
  TILE_KINDS,
  type TileType,
  tileDocPatch,
  tileHostKey,
  type ViewTileEntry,
} from './tiles'

describe('knownTile', () => {
  it('types the three known entry kinds', () => {
    expect(knownTile({ id: tileId('a'), type: 'markdown' })).toEqual({
      id: tileId('a'),
      type: 'markdown',
    })
    expect(knownTile({ id: tileId('b'), type: 'page', page_id: 'p1' })).toMatchObject({
      type: 'page',
      page_id: 'p1',
    })
    expect(
      knownTile({
        id: tileId('c'),
        type: 'view',
        views: [{ source_id: 's1', config: { id: 'v' } }],
      }),
    ).toMatchObject({
      type: 'view',
      views: [{ source_id: 's1' }],
    })
  })

  it('keeps foreign keys on a known entry (loose) — including inside view elements', () => {
    expect(knownTile({ id: tileId('a'), type: 'markdown', future_field: 1 })).toMatchObject({
      future_field: 1,
    })
    expect(
      knownTile({
        id: tileId('c'),
        type: 'view',
        views: [{ source_id: 's1', config: {}, outside_key: true }],
      }),
    ).toMatchObject({ views: [{ outside_key: true }] })
  })

  it('a view entry needs a non-empty views list; a bad active index degrades, not rejects', () => {
    expect(knownTile({ id: tileId('c'), type: 'view', views: [] })).toBeNull()
    expect(knownTile({ id: tileId('c'), type: 'view' })).toBeNull()
    expect(
      knownTile({ id: tileId('c'), type: 'view', views: [{ source_id: 's1' }], active: -2 }),
    ).toMatchObject({
      type: 'view',
      active: undefined,
    })
  })

  it('view chrome keys ride through; malformed ones degrade, not reject', () => {
    expect(
      knownTile({
        id: tileId('c'),
        type: 'view',
        views: [{ source_id: 's1' }],
        title: false,
        icon: false,
        view_button: 'icon',
        view_style: 'dropdown',
        view_band: false,
      }),
    ).toMatchObject({
      title: false,
      icon: false,
      view_button: 'icon',
      view_style: 'dropdown',
      view_band: false,
    })
    expect(
      knownTile({
        id: tileId('c'),
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
      knownTile({ id: tileId('c'), type: 'view', views: [{ source_id: 's1' }], title_level: 2 }),
    ).toMatchObject({ title_level: 2 })
    expect(
      knownTile({ id: tileId('c'), type: 'view', views: [{ source_id: 's1' }], title_level: 9 }),
    ).toMatchObject({ title_level: undefined })
    expect(
      knownTile({ id: tileId('c'), type: 'view', views: [{ source_id: 's1' }], title_level: 2.5 }),
    ).toMatchObject({ title_level: undefined })
  })

  it('returns null for unknown types and garbage — the caller renders inert', () => {
    expect(knownTile({ id: tileId('x'), type: 'widget' })).toBeNull()
    expect(knownTile({ id: '../../outside', type: 'markdown' })).toBeNull()
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
              { kind: 'tile', id: tileId('a'), h: 100 },
              {
                kind: 'column',
                children: [
                  { kind: 'tile', id: tileId('b'), h: 40 },
                  { kind: 'tile', id: tileId('c'), h: 40 },
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
    expect(split({ kind: 'column', children: [{ kind: 'tile', id: tileId('b'), h: 40 }] })).toBe(
      false,
    )
    expect(
      split({
        kind: 'row',
        ratios: [0.5, 0.5],
        children: [
          { kind: 'tile', id: tileId('a'), h: 1 },
          { kind: 'tile', id: tileId('b'), h: 1 },
          { kind: 'tile', id: tileId('c'), h: 1 },
        ],
      }),
    ).toBe(false)
  })
})

describe('tileDocPatch', () => {
  it('keeps the doc keys as sent and refuses the malformed ones', () => {
    expect(tileDocPatch({ layout: { bands: [] }, extra: 1 })).toEqual(ok({ layout: { bands: [] } }))
    const entry = { id: tileId('a'), patch: { style: 'borderless', zoom: null } }
    expect(tileDocPatch({ entry, locked: true, tiles: [] })).toEqual(ok({ entry, locked: true }))
    expect(tileDocPatch({ layout: 'garbage' })).toEqual(fault('Malformed layout.'))
    for (const bad of [
      { id: '../x', patch: {} },
      { id: tileId('a'), patch: 'no' },
      { id: tileId('a'), patch: { id: tileId('b') } },
      { id: tileId('a'), patch: { type: 'page' } },
    ])
      expect(tileDocPatch({ entry: bad })).toEqual(fault('Malformed entry patch.'))
    expect(tileDocPatch({ locked: 'yes' })).toEqual(fault('locked must be a boolean.'))
    expect(tileDocPatch(null)).toEqual(fault('Invalid tile-doc patch.'))
  })
})

describe('coerceTileHost', () => {
  it('accepts the homepage and a Space, copying out only their reference, and rejects the rest', () => {
    expect(coerceTileHost({ kind: 'homepage' })).toEqual({ kind: 'homepage' })
    expect(coerceTileHost({ kind: 'space', id: 's1', path: 'x' })).toEqual({
      kind: 'space',
      id: 's1',
    })
    expect(coerceTileHost({ kind: 'page', id: 'p1' })).toBeNull()
    expect(coerceTileHost({ kind: 'homepage', id: 'x' })).toBeNull()
    expect(coerceTileHost({ kind: 'area', path: 'x' })).toBeNull()
    expect(coerceTileHost('homepage')).toBeNull()
  })

  it('keys a host by its kind and id, apart from any navigation key', () => {
    expect(tileHostKey({ kind: 'homepage' })).toBe('homepage')
    expect(tileHostKey({ kind: 'space', id: 's1' })).toBe('space:s1')
  })
})

describe('tile entry zoom field', () => {
  it('round-trips a numeric zoom on a page entry', () => {
    expect(knownTile({ id: tileId('b'), type: 'page', page_id: 'p1', zoom: 1.25 })?.zoom).toBe(1.25)
  })

  it('drops a non-numeric zoom to undefined without failing the entry (E-1 foreign-data guard)', () => {
    const e = knownTile({ id: tileId('c'), type: 'markdown', zoom: 'big' })
    expect(e).not.toBeNull()
    expect(e?.zoom).toBeUndefined()
  })

  it('snaps a zoom to the nearest step', () => {
    const at = (zoom: number) => knownTile({ id: tileId('d'), type: 'markdown', zoom })?.zoom
    expect(at(9)).toBe(1.5)
    expect(at(0.83)).toBe(0.9)
    expect(at(-1)).toBe(0.5)
  })
})

describe('the tile recipe', () => {
  it('declares every kind once, with its file rule and its menu rows', () => {
    const kinds: TileType[] = ['markdown', 'page', 'view']
    for (const k of kinds)
      expect(TILE_KINDS[k].schema.safeParse({ id: tileId('x'), type: k }).success).toBe(
        k === 'markdown',
      )
    expect(TILE_KINDS.markdown.fileBacked).toBe(true)
    expect(TILE_KINDS.page.fileBacked).toBe(false)
    expect(TILE_KINDS.view.fileBacked).toBe(false)
    expect(TILE_KINDS.markdown.menuRows).toEqual([
      { label: 'Link View', to: 'view' },
      { label: 'Link Page', to: 'page' },
    ])
    expect(TILE_KINDS.page.menuRows).toEqual([{ label: 'Source', to: 'page' }])
    expect(TILE_KINDS.view.menuRows).toEqual([])
    expect(knownTile({ id: tileId('x'), type: 'widget' })).toBeNull()
  })
})

describe('copyEntry', () => {
  it("copyEntry dispatches by the entry's own kind and passes everything else through", () => {
    const view = { id: tileId('v'), type: 'view', views: [{ config: { id: 'old' } }] }
    expect((copyEntry(view) as typeof view).views[0].config.id).not.toBe('old')
    for (const raw of [
      null,
      7,
      { id: tileId('m'), type: 'markdown' },
      { id: tileId('x'), type: 'toString' },
      { id: tileId('y'), type: '__proto__' },
    ])
      expect(copyEntry(raw)).toBe(raw)
  })
})

// Compiled by the typecheck and never run: a field the decoder doesn't declare is no field of the type, at the entry or on its views.
const _mistypedTileField = (t: ViewTileEntry): unknown[] => [
  // @ts-expect-error
  t.view_bands,
  // @ts-expect-error
  t.views[0].confg,
]
