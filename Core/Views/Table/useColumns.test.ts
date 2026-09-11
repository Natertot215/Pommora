import { describe, it, expect } from 'vitest'
import { RESERVED_PROPERTY_ID, type PropertyDefinition } from '@pommora/core/Properties/properties'
import { savedView, type SavedView } from '@pommora/core/Views/views'
import {
  alignFor,
  clampWidth,
  defaultAlignFor,
  minWidthFor,
  reorderColumns,
  widthFor,
} from './useColumns'

describe('column widths', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_status', name: 'Status', type: 'status' },
    { id: 'prop_select', name: 'Tag', type: 'select' },
    { id: 'prop_multi', name: 'Tags', type: 'multi_select' },
    { id: 'prop_n', name: 'Count', type: 'number' },
    { id: 'prop_done', name: 'Done', type: 'checkbox' },
  ]

  describe('widthFor', () => {
    it('keys reserved columns by their declared type', () => {
      expect(widthFor(RESERVED_PROPERTY_ID.title, schema).default).toBe(280)
      expect(widthFor('ctx_areas', schema, ['ctx_areas']).default).toBe(140)
      expect(widthFor(RESERVED_PROPERTY_ID.modifiedAt, schema).default).toBe(120)
      expect(widthFor(RESERVED_PROPERTY_ID.createdAt, schema).default).toBe(120)
    })

    it('keys user properties by their schema type', () => {
      expect(widthFor('prop_status', schema)).toEqual({ min: 65, default: 120, max: 250 })
      expect(widthFor('prop_n', schema).default).toBe(100)
    })

    it('falls back for an unknown column', () => {
      expect(widthFor('prop_gone', schema)).toEqual({
        min: 80,
        default: 140,
        max: Number.POSITIVE_INFINITY,
      })
    })
  })

  describe('minWidthFor', () => {
    it('returns the type base min when no look is given', () => {
      expect(minWidthFor('prop_done', schema)).toBe(45)
      expect(minWidthFor('prop_status', schema)).toBe(80)
    })

    it('widens a checkbox to the switch min for the switch look', () => {
      expect(minWidthFor('prop_done', schema, 'checkbox')).toBe(45)
      expect(minWidthFor('prop_done', schema, 'switch')).toBe(70)
    })

    it('shares one option-chip min set across status, select and multi-select', () => {
      for (const p of ['prop_status', 'prop_select', 'prop_multi']) {
        expect(minWidthFor(p, schema, 'compact')).toBe(65)
        expect(minWidthFor(p, schema, 'standard')).toBe(80)
      }
    })

    it('falls back to the base min for a type/look with no override', () => {
      expect(minWidthFor('prop_n', schema, 'switch')).toBe(50)
      expect(minWidthFor('prop_done', schema, 'nonsense')).toBe(45)
    })
  })

  describe('clampWidth', () => {
    it('clamps a resized width up to its min; the title grows uncapped, typed columns cap per-type', () => {
      expect(clampWidth(10, RESERVED_PROPERTY_ID.title, schema)).toBe(120)
      expect(clampWidth(9999, RESERVED_PROPERTY_ID.title, schema)).toBe(9999)
      expect(clampWidth(300, RESERVED_PROPERTY_ID.title, schema)).toBe(300)
      expect(clampWidth(999, 'prop_status', schema)).toBe(250)
    })

    it('applies the style-aware min — a Switch checkbox clamps up to the switch min', () => {
      expect(clampWidth(45, 'prop_done', schema, 'switch')).toBe(70)
      expect(clampWidth(45, 'prop_done', schema, 'checkbox')).toBe(45)
      expect(clampWidth(45, 'prop_done', schema)).toBe(45)
    })
  })
})

describe('column alignment', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_status', name: 'Status', type: 'status' },
    { id: 'prop_multi', name: 'Tags', type: 'multi_select' },
    { id: 'prop_n', name: 'Count', type: 'number' },
    { id: 'prop_url', name: 'Link', type: 'url' },
    { id: 'prop_date', name: 'Due', type: 'datetime' },
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

  describe('defaultAlignFor', () => {
    it('centers the chip/box + context types', () => {
      expect(defaultAlignFor('prop_status', schema)).toBe('center')
      expect(defaultAlignFor('prop_multi', schema)).toBe('center')
      expect(defaultAlignFor('ctx_areas', schema, ['ctx_areas'])).toBe('center')
      expect(defaultAlignFor('prop_date', schema)).toBe('center')
    })

    it('left-aligns title, number, url, and modified', () => {
      expect(defaultAlignFor(RESERVED_PROPERTY_ID.title, schema)).toBe('left')
      expect(defaultAlignFor('prop_n', schema)).toBe('left')
      expect(defaultAlignFor('prop_url', schema)).toBe('left')
      expect(defaultAlignFor(RESERVED_PROPERTY_ID.modifiedAt, schema)).toBe('left')
    })

    it('falls back to left for an unknown column', () => {
      expect(defaultAlignFor('prop_gone', schema)).toBe('left')
    })
  })

  describe('alignFor', () => {
    it('uses the type default when no override is saved', () => {
      expect(alignFor('prop_status', schema, view({}))).toBe('center')
      expect(alignFor('prop_n', schema, view({}))).toBe('left')
    })

    it('honors a saved column_alignments override over the default', () => {
      const v = view({ column_alignments: { prop_status: 'left', prop_n: 'right' } })
      expect(alignFor('prop_status', schema, v)).toBe('left')
      expect(alignFor('prop_n', schema, v)).toBe('right')
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
