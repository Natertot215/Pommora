import { describe, it, expect } from 'vitest'
import {
  byKey,
  LINK_DISPLAYS,
  propertyDefinition,
  typeIds,
  isReservedPropertyId,
  isUserType,
  defaultStatusSeed,
  groupable,
  optionsOf,
  pickKindOf,
  PROPERTY_TYPES,
  specOf,
  type PropertyDefinition,
  type SelectOption,
  type StatusGroup,
  narrowLinkConfig,
  narrowNumberFormat,
  SELECT_GROUP,
  withOptionGroups,
} from './properties'

describe('typeIds', () => {
  it('accepts the nine user types and Context', () => {
    for (const t of [
      'text',
      'number',
      'checkbox',
      'dateTime',
      'select',
      'multiSelect',
      'status',
      'link',
      'file',
      'context',
    ]) {
      expect(typeIds.safeParse(t).data).toBe(t)
    }
  })

  it('rejects an unknown type and every Filedata type', () => {
    for (const t of ['rich_text', 'title', 'createdTime', 'lastEditedTime'])
      expect(typeIds.safeParse(t).success).toBe(false)
  })
})

describe('propertyDefinition', () => {
  it('round-trips a fully-specified def and preserves a foreign key', () => {
    const def = {
      id: 'prop_01H',
      label: 'Stage',
      key: 'Stage',
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
    const def = {
      id: 'prop_ck',
      label: 'Done',
      key: 'Done',
      type: 'checkbox',
      checkbox_color: 'blue',
    }
    expect(propertyDefinition.parse(def)).toEqual(def)
  })

  it('drops a non-string checkbox_color to undefined rather than failing the def', () => {
    const parsed = propertyDefinition.parse({
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'checkbox',
      checkbox_color: 42,
    })
    expect(parsed.checkbox_color).toBeUndefined()
  })

  it('round-trips a link def in each of the three link displays', () => {
    for (const link_display of LINK_DISPLAYS) {
      const def = { id: 'prop_u', label: 'Site', key: 'Site', type: 'link', link_display }
      expect(propertyDefinition.parse(def)).toEqual(def)
    }
  })

  // An unrecognized stored value drops to undefined and the call site's default is the mode `link-url` already meant, so a def written by an older build lands exactly where it was.
  it('drops an unrecognized link_display to undefined rather than failing the def', () => {
    const parsed = propertyDefinition.parse({
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'link',
      link_display: 'link-url',
    })
    expect(parsed.link_display).toBeUndefined()
  })

  it('round-trips a number def with its property-wide format config', () => {
    const def = {
      id: 'prop_n',
      label: 'Progress',
      key: 'Progress',
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
      label: 'x',
      key: 'x',
      type: 'number',
      number_family: 9,
    })
    expect(parsed.number_family).toBeUndefined()
  })

  it('accepts number_decimals as the literal "hidden" or an integer', () => {
    expect(
      propertyDefinition.parse({
        id: 'p',
        label: 'x',
        key: 'x',
        type: 'number',
        number_decimals: 'hidden',
      }).number_decimals,
    ).toBe('hidden')
    expect(
      propertyDefinition.parse({
        id: 'p',
        label: 'x',
        key: 'x',
        type: 'number',
        number_decimals: 3,
      }).number_decimals,
    ).toBe(3)
  })

  it('drops a number format Intl would throw on', () => {
    const def = propertyDefinition.parse({
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'number',
      number_currency: 'dollars',
      number_decimals: 101,
    })
    expect(def.number_currency).toBeUndefined()
    expect(def.number_decimals).toBeUndefined()
    expect(
      propertyDefinition.parse({
        id: 'p',
        label: 'x',
        key: 'x',
        type: 'number',
        number_currency: 'CHF',
      }).number_currency,
    ).toBe('CHF')
  })

  it('requires id, key, and a valid type', () => {
    expect(propertyDefinition.safeParse({ label: 'x', key: 'x', type: 'number' }).success).toBe(
      false,
    )
    expect(propertyDefinition.safeParse({ id: 'p', type: 'number' }).success).toBe(false)
    expect(
      propertyDefinition.safeParse({ id: 'p', label: 'x', key: 'x', type: 'nope' }).success,
    ).toBe(false)
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

describe('PROPERTY_TYPES', () => {
  it('groups by Select, Status and Date only', () => {
    const grouping = (Object.keys(PROPERTY_TYPES) as (keyof typeof PROPERTY_TYPES)[]).filter((t) =>
      groupable(t),
    )
    expect(grouping).toEqual(['dateTime', 'select', 'status'])
  })

  it('admits the nine user types and nothing a Context or Filedata column wears', () => {
    expect(Object.keys(PROPERTY_TYPES).filter(isUserType)).toEqual([
      'text',
      'number',
      'checkbox',
      'dateTime',
      'select',
      'multiSelect',
      'status',
      'link',
      'file',
    ])
    expect(isUserType('nope')).toBe(false)
  })

  it('Status keeps its options in status_groups and wears the select kind', () => {
    expect(PROPERTY_TYPES.status).toEqual({
      kind: 'select',
      origin: 'user',
      groups: true,
      options: 'status',
    })
  })
})

describe('specOf and pickKindOf', () => {
  it('Title reads as text, and an unknown type has no spec', () => {
    expect(specOf('title')).toEqual({ kind: 'text', origin: 'filedata' })
    expect(specOf(undefined)).toBeUndefined()
  })

  it('picks by kind: Status picks as a select, Multi-Select and Context as themselves', () => {
    expect(pickKindOf('status')).toBe('select')
    expect(pickKindOf('multiSelect')).toBe('multiSelect')
    expect(pickKindOf('context')).toBe('context')
    for (const t of [
      'text',
      'number',
      'checkbox',
      'dateTime',
      'link',
      'file',
      'createdTime',
      'title',
      undefined,
    ] as const)
      expect(pickKindOf(t)).toBeNull()
  })
})

describe('optionsOf', () => {
  it('reads a select def from select_options', () => {
    const def = {
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'select' as const,
      select_options: [{ key: 'a', label: 'a' }],
    }
    expect(optionsOf(def).map((o) => o.label)).toEqual(['a'])
  })

  it('returns [] for a def with no options and for undefined', () => {
    expect(optionsOf({ type: 'number' })).toEqual([])
    expect(optionsOf(undefined)).toEqual([])
  })

  it('reads a status def from its groups, ignoring a stale select_options left by a type change', () => {
    const def = {
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'status' as const,
      status_groups: defaultStatusSeed(),
      select_options: [{ key: 'stale', label: 'stale' }],
    }
    expect(optionsOf(def).map((o) => o.label)).toEqual(['Open', 'Active', 'Done'])
  })
})

describe('an option label', () => {
  it('reads its key when the registry stores none', () => {
    const def = propertyDefinition.parse({
      id: 'p',
      key: 'x',
      type: 'select',
      select_options: [{ key: 'a' }],
    })
    expect(def.select_options).toEqual([{ key: 'a', label: 'a' }])
  })

  it('stays through an option write', () => {
    const def: PropertyDefinition = { id: 'p', label: 'x', key: 'x', type: 'select' }
    const options = [{ key: 'a', label: 'A', group_id: SELECT_GROUP }]
    expect(
      withOptionGroups(def, [{ id: SELECT_GROUP, label: '', color: '', options }]).select_options,
    ).toEqual([{ key: 'a', label: 'A' }])
  })
})

describe('status seed relabel', () => {
  it('seeds Open/Active/Done with value=title and group colors', () => {
    const g = defaultStatusSeed()
    expect(g.map((x) => x.id)).toEqual(['upcoming', 'in_progress', 'done'])
    expect(g.map((x) => x.label)).toEqual(['Open', 'Active', 'Done'])
    for (const grp of g) {
      expect(grp.options).toHaveLength(1)
      expect(grp.options[0].key).toBe(grp.label)
      expect(grp.options[0].label).toBe(grp.label)
      expect(grp.options[0].color).toBe(grp.color)
    }
  })
})

describe('keys this build does not know', () => {
  it('ride through every level of a definition', () => {
    const def = propertyDefinition.parse({
      id: 'prop_s',
      label: 'Stage',
      key: 'Stage',
      type: 'status',
      foreign_block: { key: 'a', scope: 'deep' },
      select_options: [{ key: 'a', label: 'a', tint: 'warm' }],
      status_groups: [
        {
          id: 'todo',
          label: 'To Do',
          color: 'grey',
          collapsed: true,
          options: [{ key: 'open', label: 'open', group_id: 'todo', glyph: 'o' }],
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
  })
})

describe('byKey', () => {
  it('keys definitions by key, not label', () => {
    const def = {
      id: 'p',
      label: 'Due Date',
      key: 'due_date',
      type: 'dateTime',
    } as PropertyDefinition
    expect([...byKey([def]).entries()]).toEqual([['due_date', def]])
  })
})
