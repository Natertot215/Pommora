// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import type { TileEntry } from '@shared/tiles'
import { TILE_KINDS } from '@shared/tiles'
import { tileMenuModel } from '@shared/tileMenu'
import { MarkdownTile } from './Surfaces/MarkdownTile'
import { PageTile } from './Surfaces/PageTile'
import { ViewTile } from './Surfaces/ViewTile'
import { renderTile, TILE_SURFACES, tileSourceInfo, type TileRenderContext } from './tileKinds'

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const ctx = (entry: TileEntry, pages = new Map([[page.id, page]])): TileRenderContext => ({
  entry,
  id: entry.id,
  host: { kind: 'homepage' },
  editing: false,
  beginEdit: () => {},
  suppressFlush: () => false,
  pagesById: pages,
  mutateEntry: () => {},
})
const typeOf = (node: React.ReactNode): unknown => (isValidElement(node) ? node.type : node)

describe('the renderer table', () => {
  it('has one surface per kind and dispatches each to its component', () => {
    expect(Object.keys(TILE_SURFACES).sort()).toEqual(Object.keys(TILE_KINDS).sort())
    expect(typeOf(renderTile(ctx({ id: 'm', type: 'markdown' })))).toBe(MarkdownTile)
    expect(typeOf(renderTile(ctx({ id: 'p', type: 'page', page_id: 'p1' })))).toBe(PageTile)
    expect(typeOf(renderTile(ctx({ id: 'v', type: 'view', views: [{ source_id: 's' }] })))).toBe(
      ViewTile,
    )
  })

  it('a page tile whose page is gone renders inert', () => {
    const node = renderTile(ctx({ id: 'p', type: 'page', page_id: 'p1' }, new Map()))
    expect(isValidElement(node) && (node.props as { className: string }).className).toBe(
      'tile-inert',
    )
  })

  it('only a page tile stands for a page', () => {
    expect(
      tileSourceInfo({ id: 'p', type: 'page', page_id: 'p1' }, new Map([[page.id, page]])),
    ).toBe(page)
    expect(
      tileSourceInfo({ id: 'm', type: 'markdown' }, new Map([[page.id, page]])),
    ).toBeUndefined()
  })

  it('the menu model offers exactly the link rows the table declares, per kind, in order', () => {
    const entries: TileEntry[] = [
      { id: 'm', type: 'markdown' },
      { id: 'p', type: 'page', page_id: 'p1' },
      { id: 'v', type: 'view', views: [{ source_id: 's' }] },
    ]
    for (const entry of entries) {
      const rows = TILE_KINDS[entry.type].menuRows
      const model = tileMenuModel({
        entry,
        pageItems: [{ label: 'Notes', pick: 'p9' }],
        viewItems: [{ label: 'Board', pick: { source_id: 's', view_id: 'v1' } }],
        zoomSteps: [],
        currentFactor: 1,
        locked: false,
        containerLocked: false,
      })
      const linkRows = model.items.filter((i) => rows.some((r) => r.label === i.label))
      expect(linkRows.map((i) => i.label)).toEqual(rows.map((r) => r.label))
      for (const [i, r] of rows.entries())
        expect(linkRows[i].disabled ?? false).toBe(r.source === 'none')
    }
  })
})
