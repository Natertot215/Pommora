import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from './properties'
import {
  decodeValue,
  encodeValue,
  isBlankValue,
  resolveSingleOption,
  type PropertyValue,
} from './propertyValue'

const def = (over: Partial<PropertyDefinition>): PropertyDefinition =>
  ({ id: 'p', name: 'P', type: 'select', ...over }) as PropertyDefinition

const statusDef = def({
  type: 'status',
  status_groups: [
    {
      id: 'g',
      label: 'G',
      color: 'blue',
      options: [
        { value: 'Done', label: 'Done', group_id: 'g' },
        { value: 'Open', label: 'Open', group_id: 'g' },
      ],
    },
  ],
})

const selectDef = def({
  type: 'select',
  select_options: [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
  ],
})

describe('decodeValue — the declared type decides, never the shape', () => {
  it('reads a status value as its bare label', () => {
    expect(decodeValue(statusDef, 'Done')).toEqual({ kind: 'select', value: 'Done' })
  })

  it('never guesses: a select option shaped like a date or a url stays a select', () => {
    const shaped = def({
      type: 'select',
      select_options: [
        { value: '2024-01-01', label: 'Kickoff' },
        { value: 'https://acme.io', label: 'Site' },
      ],
    })
    expect(decodeValue(shaped, '2024-01-01')).toEqual({ kind: 'select', value: '2024-01-01' })
    expect(decodeValue(shaped, 'https://acme.io')).toEqual({
      kind: 'select',
      value: 'https://acme.io',
    })
  })

  it('reads each declared type from its own bare shape', () => {
    expect(decodeValue(def({ type: 'number' }), 42)).toEqual({ kind: 'number', value: 42 })
    expect(decodeValue(def({ type: 'number' }), 0)).toEqual({ kind: 'number', value: 0 })
    expect(decodeValue(def({ type: 'checkbox' }), true)).toEqual({
      kind: 'checkbox',
      value: true,
    })
    expect(decodeValue(def({ type: 'url' }), 'https://acme.io')).toEqual({
      kind: 'url',
      value: 'https://acme.io',
    })
    expect(decodeValue(def({ type: 'datetime' }), '2026-06-15')).toEqual({
      kind: 'datetime',
      value: '2026-06-15',
    })
    expect(decodeValue(def({ type: 'multi_select' }), ['a', 'b'])).toEqual({
      kind: 'multiSelect',
      value: ['a', 'b'],
    })
  })

  it('a value whose shape contradicts its type reads as null, never as another type', () => {
    expect(decodeValue(def({ type: 'number' }), 'five')).toEqual({ kind: 'null' })
    expect(decodeValue(def({ type: 'checkbox' }), 'true')).toEqual({ kind: 'null' })
    expect(decodeValue(def({ type: 'multi_select' }), { a: 1 })).toEqual({ kind: 'null' })
  })

  it('a checkbox is true or absent — false written from outside reads as no value', () => {
    expect(decodeValue(def({ type: 'checkbox' }), false)).toEqual({ kind: 'null' })
  })

  it('a YAML number or boolean names the option it spells — an outside `- 2024` is the option "2024"', () => {
    const year = def({ type: 'select', select_options: [{ value: '2024', label: '2024' }] })
    expect(decodeValue(year, [2024])).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(year, 2024)).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(def({ type: 'multi_select' }), [true, 'x'])).toEqual({
      kind: 'multiSelect',
      value: ['true', 'x'],
    })
  })

  it('an option type reads a scalar as a list of one', () => {
    expect(decodeValue(def({ type: 'multi_select' }), 'zeta')).toEqual({
      kind: 'multiSelect',
      value: ['zeta'],
    })
    expect(decodeValue(selectDef, ['A'])).toEqual({ kind: 'select', value: 'A' })
    expect(decodeValue(statusDef, ['Done'])).toEqual({ kind: 'select', value: 'Done' })
  })

  it('both stamp types decode as a datetime', () => {
    expect(decodeValue(def({ type: 'last_edited_time' }), '2026-06-15T14:30:00Z')).toEqual({
      kind: 'datetime',
      value: '2026-06-15T14:30:00Z',
    })
    expect(decodeValue(def({ type: 'created_time' }), '2026-06-15T14:30:00Z')).toEqual({
      kind: 'datetime',
      value: '2026-06-15T14:30:00Z',
    })
  })
})

describe('the single-option resolution — one rule, tested on Select and on Status', () => {
  const cases: Array<[string, PropertyDefinition, [string, string, string]]> = [
    ['Select', selectDef, ['A', 'B', 'Zed']],
    ['Status', statusDef, ['Done', 'Open', 'Retired']],
  ]
  for (const [type, d, [first, second, unknown]] of cases) {
    it(`${type}: an externally written list resolves to its newest registered option`, () => {
      expect(decodeValue(d, [first, second])).toEqual({ kind: 'select', value: second })
      expect(decodeValue(d, [second, first])).toEqual({ kind: 'select', value: first })
    })
    it(`${type}: an unregistered trailing option yields to the registered one before it`, () => {
      expect(decodeValue(d, [first, unknown])).toEqual({ kind: 'select', value: first })
    })
    it(`${type}: a scalar reads as a list of one`, () => {
      expect(decodeValue(d, first)).toEqual({ kind: 'select', value: first })
    })
    it(`${type}: an option the schema does not offer reads as no value`, () => {
      expect(decodeValue(d, [unknown])).toEqual({ kind: 'null' })
      expect(decodeValue(d, unknown)).toEqual({ kind: 'null' })
    })
  }

  it('resolveSingleOption is that rule', () => {
    expect(resolveSingleOption(['Open', 'Active'], ['Open', 'Active', 'Done'])).toBe('Active')
    expect(resolveSingleOption(['Green', 'Blue'], ['Red', 'Blue'])).toBe('Blue')
    expect(resolveSingleOption(['Active', 'Wip'], ['Open', 'Active'])).toBe('Active')
    expect(resolveSingleOption(['Wip'], ['Open'])).toBeUndefined()
    expect(resolveSingleOption([], ['Open'])).toBeUndefined()
  })
})

describe('decodeValue — lenient on read', () => {
  it('a select or status names only an option the schema still offers', () => {
    expect(decodeValue(selectDef, 'Gone')).toEqual({ kind: 'null' })
    expect(decodeValue(statusDef, 'Retired')).toEqual({ kind: 'null' })
    expect(decodeValue(selectDef, 'A')).toEqual({ kind: 'select', value: 'A' })
  })

  it('a multi-select keeps a value the schema does not offer yet', () => {
    const d = def({ type: 'multi_select', select_options: [{ value: 'A', label: 'A' }] })
    expect(decodeValue(d, ['A', 'Gone'])).toEqual({ kind: 'multiSelect', value: ['A', 'Gone'] })
    expect(decodeValue(d, ['Gone'])).toEqual({ kind: 'multiSelect', value: ['Gone'] })
  })

  it('an empty string is a url value', () => {
    expect(decodeValue(def({ type: 'url' }), '')).toEqual({ kind: 'url', value: '' })
  })
})

describe('decodeValue — a file value names files', () => {
  it('a single wikilink written as a scalar is a list of one', () => {
    expect(decodeValue(def({ type: 'file' }), '[[Shot.png]]')).toEqual({
      kind: 'file',
      value: ['[[Shot.png]]'],
    })
  })

  const fileDef = def({ type: 'file' })

  it('reads a list of wikilink strings', () => {
    expect(decodeValue(fileDef, ['[[a.pdf]]', '[[b.png]]'])).toEqual({
      kind: 'file',
      value: ['[[a.pdf]]', '[[b.png]]'],
    })
  })

  it('the legacy object shape reads as null — there is no name in it to keep', () => {
    expect(decodeValue(fileDef, [{ path: 'x/y.png' }])).toEqual({ kind: 'null' })
  })

  it('an entry nothing can spell is DROPPED — it never takes the rest of the list with it', () => {
    // A dangling `- ` under an attachment key is YAML null. Nulling the whole value would render
    // the cell blank, and the next in-app add would write a one-entry list over references whose
    // files are still on disk.
    expect(decodeValue(fileDef, ['[[a.pdf]]', null])).toEqual({
      kind: 'file',
      value: ['[[a.pdf]]'],
    })
    expect(decodeValue(fileDef, ['[[a.pdf]]', 2026])).toEqual({
      kind: 'file',
      value: ['[[a.pdf]]'],
    })
    expect(decodeValue(fileDef, ['[[a.pdf]]', { path: 'b.png' }])).toEqual({
      kind: 'file',
      value: ['[[a.pdf]]'],
    })
    expect(decodeValue(fileDef, ['[[a.pdf]]', ''])).toEqual({ kind: 'file', value: ['[[a.pdf]]'] })
  })

  it('coerces the unquoted hand-edit YAML reads as a nested sequence', () => {
    // `- [[Report.pdf]]` parses to [[['Report.pdf']]]; `Att: [[Report.pdf]]` to [['Report.pdf']].
    expect(decodeValue(fileDef, [[['Report.pdf']]])).toEqual({
      kind: 'file',
      value: ['[[Report.pdf]]'],
    })
    expect(decodeValue(fileDef, [['Report.pdf']])).toEqual({
      kind: 'file',
      value: ['[[Report.pdf]]'],
    })
  })

  it('a nested sequence holding more than one entry is not a wikilink and reads as null', () => {
    expect(decodeValue(fileDef, [['a.pdf', 'b.pdf']])).toEqual({ kind: 'null' })
  })

  it('nothing left to name is nothing', () => {
    // An empty list and a list of only-unspellable entries are the same answer.
    expect(decodeValue(fileDef, [])).toEqual({ kind: 'null' })
    expect(decodeValue(fileDef, [null, 2026])).toEqual({ kind: 'null' })
    // A file def has no options — every value it holds survives.
    expect(decodeValue(fileDef, ['[[a.pdf]]'])).toEqual({ kind: 'file', value: ['[[a.pdf]]'] })
    expect(isBlankValue(decodeValue(fileDef, []))).toBe(true)
  })
})

describe('encodeValue — bare on disk', () => {
  it('writes the value itself; a single option as a list of one', () => {
    expect(encodeValue({ kind: 'select', value: 'Done' })).toEqual(['Done'])
    expect(encodeValue({ kind: 'number', value: 42 })).toBe(42)
    expect(encodeValue({ kind: 'checkbox', value: true })).toBe(true)
    expect(encodeValue({ kind: 'multiSelect', value: ['a'] })).toEqual(['a'])
    expect(encodeValue({ kind: 'null' })).toBeNull()
  })

  it('round-trips every canonical shape through its own declared type', () => {
    const pairs: Array<[PropertyDefinition, unknown]> = [
      [def({ type: 'number' }), 42],
      [def({ type: 'checkbox' }), true],
      [def({ type: 'url' }), 'https://acme.io'],
      [def({ type: 'datetime' }), '2026-06-15T14:30:00Z'],
      [selectDef, ['A']],
      [def({ type: 'multi_select' }), ['a', 'b']],
      [statusDef, ['Done']],
      [def({ type: 'file' }), ['[[y.png]]']],
    ]
    for (const [d, raw] of pairs) expect(encodeValue(decodeValue(d, raw))).toEqual(raw)
  })

  it('a hand-edited unquoted wikilink encodes back as the string it meant', () => {
    const raw = [[['Report.pdf']]]
    expect(encodeValue(decodeValue(def({ type: 'file' }), raw))).toEqual(['[[Report.pdf]]'])
  })
})

describe('the no-empties rule — no value, no key', () => {
  it('null and the null kind read as blank', () => {
    expect(isBlankValue(null)).toBe(true)
    expect(isBlankValue({ kind: 'null' })).toBe(true)
  })

  const empties: PropertyValue[] = [
    { kind: 'multiSelect', value: [] },
    { kind: 'context', value: [] },
    { kind: 'file', value: [] },
    { kind: 'select', value: '' },
    { kind: 'url', value: '' },
    { kind: 'datetime', value: '' },
  ]
  for (const v of empties) {
    it(`an empty ${v.kind} deletes the key — never writes []/''`, () => {
      expect(isBlankValue(v)).toBe(true)
    })
  }

  it('number 0 and a checked checkbox are real values, not blanks', () => {
    expect(isBlankValue({ kind: 'number', value: 0 })).toBe(false)
    expect(isBlankValue({ kind: 'checkbox', value: true })).toBe(false)
  })
})
