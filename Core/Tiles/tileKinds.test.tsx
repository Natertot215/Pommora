// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type PickKind, type TileEntry, TILE_KINDS } from './tiles'
import { TileBody, tileSourceInfo } from './tileKinds'
import { tileMenuItems } from './tileHandleMenu'

vi.mock('./Surfaces/MarkdownTile', () => ({ MarkdownTile: () => <div data-surface="markdown" /> }))
vi.mock('./Surfaces/PageTile', () => ({ PageTile: () => <div data-surface="page" /> }))
vi.mock('./Surfaces/ViewTile', () => ({ ViewTile: () => <div data-surface="view" /> }))

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => act(() => root.unmount()))

const mount = (entry: TileEntry, resolved?: typeof page): Element | null => {
  act(() =>
    root.render(
      <TileBody
        entry={entry}
        host={{ kind: 'homepage' }}
        editing={false}
        beginEdit={() => {}}
        page={resolved}
        mutateEntry={() => {}}
      />,
    ),
  )
  return container.firstElementChild
}

describe('the renderer table', () => {
  it('dispatches each kind to its component', () => {
    expect(mount({ id: 'm', type: 'markdown' })?.getAttribute('data-surface')).toBe('markdown')
    expect(
      mount({ id: 'p', type: 'page', page_id: 'p1' }, page)?.getAttribute('data-surface'),
    ).toBe('page')
    expect(
      mount({ id: 'v', type: 'view', views: [{ source_id: 's' }] })?.getAttribute('data-surface'),
    ).toBe('view')
  })

  it('a page tile whose page is gone renders inert', () => {
    mount({ id: 'p', type: 'page', page_id: 'p1' })
    expect(container.querySelector('.tile-inert')).not.toBeNull()
    expect(container.querySelector('[data-surface]')).toBeNull()
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
      const model = tileMenuItems({
        entry,
        pickTree: ((kind: PickKind) =>
          kind === 'page'
            ? [{ label: 'Notes', pick: 'p9' }]
            : [{ label: 'Board', pick: { source_id: 's', view_id: 'v1' } }]) as never,
        boardLocked: false,
      })
      const linkRows = model.items.filter((i) => rows.some((r) => r.label === i.label))
      expect(linkRows.map((i) => i.label)).toEqual(rows.map((r) => r.label))
      for (const row of linkRows) expect(row.disabled ?? false).toBe(false)
    }
  })
})
