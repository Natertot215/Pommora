import { describe, it, expect } from 'vitest'
import { defaultStatusSeed } from './registryProperty'
import { LINK_DISPLAYS } from '../Connections/linkValue'
import {
  byKey,
  CREATABLE_TYPES,
  propertyDefinition,
  typeIds,
  optionsOf,
  pickKindOf,
  PROPERTY_TYPES,
  specOf,
  type PropertyDefinition,
  type SelectOption,
  type StatusGroup,
  propertyConfig,
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
  it('an option stored without an id answers to the id its key derives, and a stored id reads as written', () => {
    const ids = (options: unknown[]) =>
      propertyDefinition
        .parse({ id: 'p', key: 'S', type: 'select', select_options: options })
        .select_options?.map((o) => o.id)
    expect(ids([{ key: 'Done' }, { id: 'opt_X', key: 'Todo' }])).toEqual(['opt_Done', 'opt_X'])
    expect(ids([{ id: '', key: 'Done' }])).toEqual(['opt_Done'])
  })

  it('a Status option stored without its group’s id is admitted', () => {
    const r = propertyDefinition.safeParse({
      id: 'p',
      key: 'Stage',
      type: 'status',
      status_groups: [
        { id: 'done', label: 'Done', options: [{ key: 'Done' }, { key: 'Shipped' }] },
      ],
    })
    expect(r.success).toBe(true)
    expect(r.data?.status_groups?.[0].options.map((o) => o.id)).toEqual(['opt_Done', 'opt_Shipped'])
  })

  it('a stored denominator of zero or less reads as unset, and the definition stays admitted', () => {
    const denominator = (n: number) => {
      const r = propertyDefinition.safeParse({
        id: 'p',
        key: 'N',
        type: 'number',
        number_denominator: n,
      })
      expect(r.success).toBe(true)
      return r.data?.number_denominator
    }
    expect(denominator(0)).toBeUndefined()
    expect(denominator(-4)).toBeUndefined()
    expect(denominator(8)).toBe(8)
  })

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

describe('PROPERTY_TYPES', () => {
  it('creates the user types in the New Property order, and every other type is Context or Filedata', () => {
    expect(CREATABLE_TYPES).toEqual([
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
    const others = Object.entries(PROPERTY_TYPES).filter(
      ([t]) => !(CREATABLE_TYPES as string[]).includes(t),
    )
    for (const [, s] of others) expect(['context', 'filedata']).toContain(s.origin)
  })

  it("holds connections on Link's value and Text's prose, registers members on Multi-Select, and draws a blank on Checkbox alone", () => {
    const entries = Object.entries(PROPERTY_TYPES)
    expect(entries.filter(([, s]) => s.connections).map(([t, s]) => [t, s.connections])).toEqual([
      ['text', 'prose'],
      ['link', 'value'],
    ])
    expect(entries.filter(([, s]) => s.registersMembers).map(([t]) => t)).toEqual(['multiSelect'])
    expect(entries.filter(([, s]) => s.blankDraws).map(([t]) => t)).toEqual(['checkbox'])
  })

  it('Status keeps its options in status_groups and wears the select kind', () => {
    expect(PROPERTY_TYPES.status).toEqual({
      kind: 'select',
      origin: 'user',
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
      select_options: [{ id: 'opt_a', key: 'a', label: 'a' }],
    }
    expect(optionsOf(def).map((o) => o.label)).toEqual(['a'])
  })

  it('returns [] for a def with no options and for undefined', () => {
    expect(optionsOf({ type: 'number' })).toEqual([])
    expect(optionsOf(undefined)).toEqual([])
  })

  it('reads a status def from its groups, ignoring a stale select_options a hand edit left', () => {
    const def = {
      id: 'p',
      label: 'x',
      key: 'x',
      type: 'status' as const,
      status_groups: defaultStatusSeed(),
      select_options: [{ id: 'opt_stale', key: 'stale', label: 'stale' }],
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
    expect(def.select_options).toEqual([{ id: 'opt_a', key: 'a', label: 'a' }])
  })

  it('stays through an option write', () => {
    const def: PropertyDefinition = { id: 'p', label: 'x', key: 'x', type: 'select' }
    const options = [{ id: 'opt_a', key: 'a', label: 'A' }]
    expect(
      withOptionGroups(def, [{ id: SELECT_GROUP, label: '', color: '', options }]).select_options,
    ).toEqual([{ id: 'opt_a', key: 'a', label: 'A' }])
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
      select_options: [{ id: 'opt_a', key: 'a', label: 'a', tint: 'warm' }],
      status_groups: [
        {
          id: 'todo',
          label: 'To Do',
          color: 'grey',
          collapsed: true,
          options: [{ id: 'opt_open', key: 'open', label: 'open', glyph: 'o' }],
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

describe('propertyConfig', () => {
  it("the configure patch decodes against the definition's own display fields", () => {
    expect(propertyConfig.parse({ link_underline: true, type: 'text', id: 'x' })).toStrictEqual({
      link_underline: true,
    })
    expect(propertyConfig.parse({ number_decimals: 101, number_family: 'percent' })).toStrictEqual({
      number_decimals: undefined,
      number_family: 'percent',
    })
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
