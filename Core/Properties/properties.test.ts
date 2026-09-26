import { describe, it, expect } from 'vitest'
import {
  LINK_DISPLAYS,
  propertyDefinition,
  propertyType,
  isReservedPropertyId,
  invalidPropertyName,
  defaultStatusSeed,
  isOptionsKind,
  optionsOf,
  type PropertyDefinition,
  type SelectOption,
  type StatusGroup,
  narrowOptions,
  narrowLinkConfig,
  narrowNumberFormat,
  narrowStatusGroups,
} from './properties'

describe('propertyType', () => {
  it('accepts the 11 on-disk type strings', () => {
    for (const t of [
      'number',
      'checkbox',
      'datetime',
      'select',
      'multi_select',
      'status',
      'url',
      'context',
      'created_time',
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

  // An unrecognized stored value drops to undefined and the call site's default is the mode `link-url` already meant, so a def written by an older build lands exactly where it was.
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

  it('drops a number format Intl would throw on', () => {
    const def = propertyDefinition.parse({
      id: 'p',
      name: 'x',
      type: 'number',
      number_currency: 'dollars',
      number_decimals: 101,
    })
    expect(def.number_currency).toBeUndefined()
    expect(def.number_decimals).toBeUndefined()
    expect(
      propertyDefinition.parse({ id: 'p', name: 'x', type: 'number', number_currency: 'CHF' })
        .number_currency,
    ).toBe('CHF')
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

describe('invalidPropertyName', () => {
  it('refuses empty, the $ prefix, the Context sigil, and the keys Pommora manages', () => {
    expect(invalidPropertyName('')).toBe(true)
    expect(invalidPropertyName('$role')).toBe(true)
    expect(invalidPropertyName('<Foo')).toBe(true)
    expect(invalidPropertyName('modified_at')).toBe(true)
    expect(invalidPropertyName(' PageID ')).toBe(true)
    expect(invalidPropertyName('id')).toBe(true)
    expect(invalidPropertyName('heading_icon_hidden')).toBe(true)
    expect(invalidPropertyName('pageid')).toBe(false)
    expect(invalidPropertyName('Budget ($)')).toBe(false)
  })

  it('takes icon as an ordinary name', () => {
    expect(invalidPropertyName('icon')).toBe(false)
  })
})

describe('isOptionsKind', () => {
  it('holds for the four option-bearing kinds and nothing else', () => {
    for (const t of ['select', 'status', 'multi_select', 'context'] as const)
      expect(isOptionsKind(t)).toBe(true)
    for (const t of ['number', 'checkbox', 'datetime', 'url', 'file', 'title', undefined] as const)
      expect(isOptionsKind(t)).toBe(false)
  })
})

describe('optionsOf', () => {
  it('reads a select def from select_options', () => {
    const def = {
      id: 'p',
      name: 'x',
      type: 'select' as const,
      select_options: [{ value: 'a', label: 'A' }],
    }
    expect(optionsOf(def).map((o) => o.value)).toEqual(['a'])
  })

  it('returns [] for a def with no options and for undefined', () => {
    expect(optionsOf({ type: 'number' })).toEqual([])
    expect(optionsOf(undefined)).toEqual([])
  })

  it('reads a status def from its groups, ignoring a stale select_options left by a type change', () => {
    const def = {
      id: 'p',
      name: 'x',
      type: 'status' as const,
      status_groups: defaultStatusSeed(),
      select_options: [{ value: 'stale', label: 'Stale' }],
    }
    expect(optionsOf(def).map((o) => o.value)).toEqual(['Open', 'Active', 'Done'])
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

describe('keys this build does not know', () => {
  it('ride through every level of a definition', () => {
    const def = propertyDefinition.parse({
      id: 'prop_s',
      name: 'Stage',
      type: 'status',
      foreign_block: { key: 'a', scope: 'deep' },
      select_options: [{ value: 'a', label: 'A', tint: 'warm' }],
      status_groups: [
        {
          id: 'todo',
          label: 'To Do',
          color: 'grey',
          collapsed: true,
          options: [{ value: 'open', label: 'Open', group_id: 'todo', glyph: 'o' }],
        },
      ],
    })
    expect(def).toMatchObject({ foreign_block: { scope: 'deep' } })
    expect(def.select_options?.[0]).toMatchObject({ tint: 'warm' })
    expect(def.status_groups?.[0]).toMatchObject({ collapsed: true })
    expect(def.status_groups?.[0].options[0]).toMatchObject({ glyph: 'o' })
  })
})

// Compiled by the typecheck and never run: a field the decoder doesn't declare is no field of the type.
const _mistypedFields = (d: PropertyDefinition, o: SelectOption, g: StatusGroup): unknown[] => [
  // @ts-expect-error
  d.link_dispaly,
  // @ts-expect-error
  o.apperance,
  // @ts-expect-error
  g.colour,
  // @ts-expect-error
  g.options[0].grup_id,
]

describe("the display-config narrowers decode against the definition's own fields", () => {
  it('keeps only the fields a config names, leaves an absent one, and resets an invalid one', () => {
    expect(narrowLinkConfig({ link_underline: true, type: 'text', id: 'x' })).toStrictEqual({
      link_underline: true,
    })
    expect(narrowNumberFormat({ number_decimals: 101, number_family: 'percent' })).toStrictEqual({
      number_decimals: undefined,
      number_family: 'percent',
    })
    expect(narrowNumberFormat('nope')).toBeNull()
    expect(narrowStatusGroups([{ id: 'g', label: 'G', options: [] }])).toEqual([
      { id: 'g', label: 'G', color: 'grey', options: [] },
    ])
    expect(narrowStatusGroups([{ label: 'no id' }])).toBeNull()
    expect(narrowOptions([{ value: 'a', label: 'A', group_id: 'g' }])).toEqual([
      { value: 'a', label: 'A', group_id: 'g' },
    ])
    expect(narrowOptions([{ value: 'a' }])).toBeNull()
  })
})
