// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { FILEDATA, type PropertyDefinition } from '../../Properties/properties'
import type { CollectionNode } from '../../Nexus/tree'
import { savedView, type SavedView } from '../views'
import { firePointer } from '@pommora/uix/Utilities/pointerHarness'
import { mountEachTest, renderView, settle } from '../../Testing/viewHarness'
import { useSession } from '../../Session/store'
import { valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'
import { alignFor, clampWidth, COLUMN_LAYOUT, minWidthFor } from './useColumns'
import { resolveColumn } from '../Pipeline/columns'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', label: 'Status', key: 'Status', type: 'status' },
  { id: 'prop_select', label: 'Tag', key: 'Tag', type: 'select' },
  { id: 'prop_multi', label: 'Tags', key: 'Tags', type: 'multiSelect' },
  { id: 'prop_n', label: 'Count', key: 'Count', type: 'number' },
  { id: 'prop_done', label: 'Done', key: 'Done', type: 'checkbox' },
  { id: 'prop_url', label: 'Link', key: 'Link', type: 'link' },
  { id: 'prop_date', label: 'Due', key: 'Due', type: 'dateTime' },
  { id: 'prop_notes', label: 'Notes', key: 'Notes', type: 'text' },
]

function view(over: Partial<SavedView>): SavedView {
  return savedView.parse({
    id: 'view_x',
    name: 'V',
    type: 'table',
    property_order: [],
    hidden_properties: [],
    ...over,
  })
}

describe('column widths', () => {
  describe('COLUMN_LAYOUT', () => {
    it('keys reserved columns by their declared type', () => {
      expect(COLUMN_LAYOUT.title.width).toBe(280)
      expect(COLUMN_LAYOUT.context.width).toBe(140)
      expect(COLUMN_LAYOUT.lastEditedTime.width).toBe(120)
      expect(COLUMN_LAYOUT.createdTime.width).toBe(120)
    })

    it('keys user properties by their schema type', () => {
      expect(COLUMN_LAYOUT.status).toMatchObject({ min: 65, width: 120, max: 250 })
      expect(COLUMN_LAYOUT.number.width).toBe(100)
    })

    it('keys a Link column by its own width', () => {
      expect(COLUMN_LAYOUT.link).toMatchObject({ min: 100, width: 140, max: 350 })
    })
  })

  describe('minWidthFor', () => {
    it('returns the type base min when no look is given', () => {
      expect(minWidthFor('checkbox')).toBe(45)
      expect(minWidthFor('status')).toBe(80)
    })

    it('widens a checkbox to the switch min for the switch look', () => {
      expect(minWidthFor('checkbox', 'checkbox')).toBe(45)
      expect(minWidthFor('checkbox', 'switch')).toBe(70)
    })

    it('shares one option-chip min set across status, select and multi-select', () => {
      for (const t of ['status', 'select', 'multiSelect'] as const) {
        expect(minWidthFor(t, 'compact')).toBe(65)
        expect(minWidthFor(t, 'standard')).toBe(80)
      }
    })

    it('falls back to the base min for a type/look with no override', () => {
      expect(minWidthFor('number', 'switch')).toBe(50)
    })
  })

  describe('clampWidth', () => {
    it('clamps a resized width up to its min; the title grows uncapped, typed columns cap per-type', () => {
      expect(clampWidth(10, 'title')).toBe(120)
      expect(clampWidth(9999, 'title')).toBe(9999)
      expect(clampWidth(300, 'title')).toBe(300)
      expect(clampWidth(999, 'status')).toBe(250)
    })

    it('applies the style-aware min — a Switch checkbox clamps up to the switch min', () => {
      expect(clampWidth(45, 'checkbox', 'switch')).toBe(70)
      expect(clampWidth(45, 'checkbox', 'checkbox')).toBe(45)
      expect(clampWidth(45, 'checkbox')).toBe(45)
    })
  })
})

describe('column alignment', () => {
  const col = (id: string) => resolveColumn(id, schema, ['ctx_areas'])!

  describe('the type default', () => {
    it('centers the chip/box + context types', () => {
      expect(alignFor(col('prop_status'), view({}))).toBe('center')
      expect(alignFor(col('prop_multi'), view({}))).toBe('center')
      expect(alignFor(col('ctx_areas'), view({}))).toBe('center')
      expect(alignFor(col('prop_date'), view({}))).toBe('center')
    })

    it('left-aligns title, number, link, text, and modified', () => {
      expect(alignFor(col(FILEDATA.title.id), view({}))).toBe('left')
      expect(alignFor(col('prop_n'), view({}))).toBe('left')
      expect(alignFor(col('prop_url'), view({}))).toBe('left')
      expect(alignFor(col('prop_notes'), view({}))).toBe('left')
      expect(alignFor(col(FILEDATA.modifiedAt.id), view({}))).toBe('left')
    })
  })

  describe('alignFor', () => {
    it('uses the type default when no override is saved', () => {
      expect(alignFor(col('prop_status'), view({}))).toBe('center')
      expect(alignFor(col('prop_n'), view({}))).toBe('left')
    })

    it('honors a saved column_alignments override over the default', () => {
      const v = view({ column_alignments: { prop_status: 'left', prop_n: 'right' } })
      expect(alignFor(col('prop_status'), v)).toBe('left')
      expect(alignFor(col('prop_n'), v)).toBe('right')
    })
  })
})

describe('column width', () => {
  const statusDef: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'status',
  }
  const source = (view?: Partial<SavedView>): CollectionNode =>
    ({
      kind: 'collection',
      id: 'col1',
      title: 'Col',
      path: 'Col',
      sets: [
        {
          kind: 'set',
          id: 'sA',
          title: 'A',
          path: 'Col/A',
          pages: [{ kind: 'page', id: 'pA', title: 'In A', path: 'Col/A/In A.md' }],
          sets: [],
        },
      ],
      pages: [{ kind: 'page', id: 'pLoose', title: 'Loose', path: 'Col/Loose.md' }],
      propertyIds: [statusDef.id],
      views: [
        {
          id: 'view_1',
          name: 'Table',
          type: 'table',
          property_order: ['_title', 'prop_status'],
          hidden_properties: [],
          group: { kind: 'structural' },
          ...view,
        },
      ],
    }) as unknown as CollectionNode

  let host: HTMLDivElement
  let root: Root
  mountEachTest((h, r) => {
    host = h
    root = r
  })
  let saveSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'v1' } }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'view:loadValues': async () => valuesReply({}),
      'views:save': saveSpy,
    })
    useSession.setState({
      tree: {
        collections: [],
        contexts: [],
        config: { personalization: {}, registry: [statusDef] },
      } as never,
      selection: { kind: 'none' } as never,
      renamingPath: null,
    })
  })

  const mountTable = (over?: Partial<SavedView>): Promise<void> => renderView(root, source(over))
  const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView
  const resize = async (by: number): Promise<void> => {
    const grip = host.querySelectorAll('.col-resizer')[1]
    vi.spyOn(grip.parentElement!, 'getBoundingClientRect').mockReturnValue({
      width: 120,
    } as DOMRect)
    await act(async () => firePointer(grip, 'pointerdown', { x: 100, y: 5 }))
    await act(async () => firePointer(window, 'pointermove', { x: 100 + by, y: 5 }))
    await act(async () => firePointer(window, 'pointerup'))
    await settle()
  }
  const cols = (): string =>
    (host.querySelector('.table-grid') as HTMLElement).style.getPropertyValue('--cols')

  it("a resized column's staged width drops once the stored view carries it", async () => {
    await mountTable()
    expect(cols()).toBe('minmax(280px, 1fr) 120px')
    await resize(40)
    expect(lastSavedView().column_widths).toEqual({ prop_status: 160 })
    expect(cols()).toBe('minmax(280px, 1fr) 160px')
    await mountTable({ column_widths: { prop_status: 160 } })
    await mountTable()
    expect(cols()).toBe('minmax(280px, 1fr) 120px')
  })

  it('a width the walker cleared is not written back by the next persist', async () => {
    await mountTable()
    await resize(40)
    await mountTable({ column_widths: { prop_status: 160 } })
    await mountTable()
    const outline = host.querySelectorAll('.group-band-drop-outline')[0]
    await act(async () => (outline as HTMLElement).click())
    expect(lastSavedView().collapsed_groups).toEqual(['sA'])
    expect(lastSavedView().column_widths?.prop_status).toBeUndefined()
  })
})
