import { describe, it, expect } from 'vitest'
import {
  LINK_DISPLAYS,
  propertyDefinition,
  propertyType,
  isReservedPropertyId,
  defaultStatusSeed,
} from './properties'

describe('propertyType', () => {
  it('accepts the 10 on-disk type strings', () => {
    for (const t of [
      'number',
      'checkbox',
      'datetime',
      'select',
      'multi_select',
      'status',
      'url',
      'context',
      'last_edited_time',
      'file',
    ]) {
      expect(propertyType.safeParse(t).success).toBe(true)
    }
  })

  it('rejects an unknown type', () => {
    expect(propertyType.safeParse('rich_text').success).toBe(false)
  })
})

describe('propertyDefinition', () => {
  it('round-trips a fully-specified def and preserves a foreign key', () => {
    const def = {
      id: 'prop_01H',
      name: 'Stage',
      type: 'status',
      icon: 'circle',
      status_groups: defaultStatusSeed(),
      // foreign / display-config keys ride through (looseObject)
      display_as: 'pill',
      plugin_meta: { keep: true },
    }
    const parsed = propertyDefinition.parse(def)
    expect(parsed).toEqual(def)
  })

  it('round-trips a checkbox def with its property-wide color', () => {
    const def = { id: 'prop_ck', name: 'Done', type: 'checkbox', checkbox_color: 'blue' }
    expect(propertyDefinition.parse(def)).toEqual(def)
  })

  it('drops a non-string checkbox_color to undefined rather than failing the def', () => {
    const parsed = propertyDefinition.parse({
      id: 'p',
      name: 'x',
      type: 'checkbox',
      checkbox_color: 42,
    })
    expect(parsed.checkbox_color).toBeUndefined()
  })

  it('round-trips a url def in each of the three link displays', () => {
    for (const link_display of LINK_DISPLAYS) {
      const def = { id: 'prop_u', name: 'Site', type: 'url', link_display }
      expect(propertyDefinition.parse(def)).toEqual(def)
    }
  })

  // The rename from `link-url` rides on this: an unrecognized stored value drops to undefined, and
  // the call site's default is the mode `link-url` already meant, so a def written by an older build
  // lands exactly where it was.
  it('drops an unrecognized link_display to undefined rather than failing the def', () => {
    const parsed = propertyDefinition.parse({
      id: 'p',
      name: 'x',
      type: 'url',
      link_display: 'link-url',
    })
    expect(parsed.link_display).toBeUndefined()
  })

  it('round-trips a number def with its property-wide format config', () => {
    const def = {
      id: 'prop_n',
      name: 'Progress',
      type: 'number',
      number_family: 'currency',
      number_currency: 'GBP',
      number_separators: true,
      number_decimals: 2,
      number_fraction: true,
      number_denominator: 100,
    }
    expect(propertyDefinition.parse(def)).toEqual(def)
  })

  it('drops a non-string number_family to undefined rather than failing the def', () => {
    const parsed = propertyDefinition.parse({
      id: 'p',
      name: 'x',
      type: 'number',
      number_family: 9,
    })
    expect(parsed.number_family).toBeUndefined()
  })

  it('accepts number_decimals as the literal "hidden" or an integer', () => {
    expect(
      propertyDefinition.parse({ id: 'p', name: 'x', type: 'number', number_decimals: 'hidden' })
        .number_decimals,
    ).toBe('hidden')
    expect(
      propertyDefinition.parse({ id: 'p', name: 'x', type: 'number', number_decimals: 3 })
        .number_decimals,
    ).toBe(3)
  })

  it('requires id, name, and a valid type', () => {
    expect(propertyDefinition.safeParse({ name: 'x', type: 'number' }).success).toBe(false)
    expect(propertyDefinition.safeParse({ id: 'p', type: 'number' }).success).toBe(false)
    expect(propertyDefinition.safeParse({ id: 'p', name: 'x', type: 'nope' }).success).toBe(false)
  })
})

describe('reserved property ids', () => {
  it('recognizes reserved vs user ids', () => {
    expect(isReservedPropertyId('_title')).toBe(true)
    expect(isReservedPropertyId('_modified_at')).toBe(true)
    expect(isReservedPropertyId('prop_01H')).toBe(false)
    expect(isReservedPropertyId('stage')).toBe(false)
  })
})

describe('status seed relabel', () => {
  it('seeds Open/Active/Done with value=label=title and group colors', () => {
    const g = defaultStatusSeed()
    expect(g.map((x) => x.id)).toEqual(['upcoming', 'in_progress', 'done'])
    expect(g.map((x) => x.label)).toEqual(['Open', 'Active', 'Done'])
    for (const grp of g) {
      expect(grp.options).toHaveLength(1)
      expect(grp.options[0].value).toBe(grp.label)
      expect(grp.options[0].label).toBe(grp.label)
      expect(grp.options[0].color).toBe(grp.color)
    }
  })
})
