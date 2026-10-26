import { describe, it, expect } from 'vitest'
import { FILEDATA, type PropertyDefinition } from '../../Properties/properties'
import { savedView, type SavedView } from '../views'
import { alignFor, clampWidth, COLUMN_LAYOUT, minWidthFor, reorderColumns } from './useColumns'
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

describe('column order', () => {
  describe('reorderColumns', () => {
    it('moves a visible column to a new slot, writing the full explicit order', () => {
      expect(
        reorderColumns(['_title', 'a', 'b', 'c'], ['_title', 'a', 'b', 'c'], 'c', 'a'),
      ).toEqual(['_title', 'c', 'a', 'b'])
    })

    it('preserves a hidden property (in property_order, not rendered) at the tail — survives hide/show', () => {
      expect(reorderColumns(['_title', 'a'], ['_title', 'hidden1', 'a'], 'a', '_title')).toEqual([
        'a',
        '_title',
        'hidden1',
      ])
    })

    it('writes default-on Context/title columns explicitly even when absent from property_order', () => {
      expect(reorderColumns(['_title', 'ctx_areas'], [], 'ctx_areas', '_title')).toEqual([
        'ctx_areas',
        '_title',
      ])
    })

    it('normalizes (visible + hidden) without moving when active === over', () => {
      expect(reorderColumns(['_title', 'a'], ['_title', 'a', 'hidden1'], 'a', 'a')).toEqual([
        '_title',
        'a',
        'hidden1',
      ])
    })
  })
})
