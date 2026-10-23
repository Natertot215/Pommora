import { describe, expect, it } from 'vitest'
import type { PropertyDefinition, SelectOption } from './properties'
import {
  readNumber,
  spelledNumber,
  decodeValue,
  encodeValue,
  findOption,
  isBlankValue,
  keepingForeignWords,
  type PropertyValue,
} from './propertyValue'

const def = (over: Partial<PropertyDefinition>): PropertyDefinition =>
  ({ id: 'p', label: 'P', key: 'P', type: 'select', ...over }) as PropertyDefinition

const statusDef = def({
  type: 'status',
  status_groups: [
    {
      id: 'g',
      label: 'G',
      color: 'blue',
      options: [
        { id: 'opt_Done', key: 'Done', label: 'Done' },
        { id: 'opt_Open', key: 'Open', label: 'Open' },
      ],
    },
  ],
})

const selectDef = def({
  type: 'select',
  select_options: [
    { id: 'opt_A', key: 'A', label: 'A' },
    { id: 'opt_B', key: 'B', label: 'B' },
  ],
})

const multiSelectOf = (...values: string[]): PropertyDefinition =>
  def({
    type: 'multiSelect',
    select_options: values.map((value) => ({ id: `opt_${value}`, key: value, label: value })),
  })

const keyedOptions: SelectOption[] = [
  { id: 'opt_done', key: 'done', label: 'Done' },
  { id: 'opt_in-progress', key: 'in-progress', label: 'In Progress' },
]
const keyedSelect = def({ type: 'select', select_options: keyedOptions })
const keyedMulti = def({ type: 'multiSelect', select_options: keyedOptions })

describe('decodeValue — the declared type decides, never the shape', () => {
  it('free text reads a string as itself, an unquoted wikilink as the connection it spells, and any other shape as the yaml that spells it', () => {
    const text = def({ type: 'text' })
    expect(decodeValue(text, 'see [[Plan]] first')).toEqual({
      kind: 'text',
      value: 'see [[Plan]] first',
    })
    expect(decodeValue(text, [])).toEqual({ kind: 'null' })
    expect(decodeValue(text, ['a\nb', 'c'])).toEqual({ kind: 'text', value: '["a\\nb", "c"]' })
    expect(decodeValue(text, 42)).toEqual({ kind: 'text', value: '42' })
    expect(decodeValue(text, true)).toEqual({ kind: 'text', value: 'true' })
    expect(decodeValue(text, 3.1)).toEqual({ kind: 'text', value: '3.1' })
    expect(decodeValue(text, ['milk', 'eggs', 'bread'])).toEqual({
      kind: 'text',
      value: '[milk, eggs, bread]',
    })
    expect(decodeValue(text, { x: 1 })).toEqual({ kind: 'text', value: '{x: 1}' })
    expect(decodeValue(text, [['Page']])).toEqual({ kind: 'text', value: '[[Page]]' })
    expect(decodeValue(text, [['007']])).toEqual({ kind: 'text', value: '[[007]]' })
  })

  it('reads a status value as its bare label', () => {
    expect(decodeValue(statusDef, 'Done')).toEqual({ kind: 'select', value: 'Done' })
  })

  it('never guesses: a select option shaped like a date or a url stays a select', () => {
    const shaped = def({
      type: 'select',
      select_options: [
        { id: 'opt_2024-01-01', key: '2024-01-01', label: '2024-01-01' },
        { id: 'opt_https%3A%2F%2Facme.io', key: 'https://acme.io', label: 'https://acme.io' },
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
    expect(decodeValue(def({ type: 'link' }), 'https://acme.io')).toEqual({
      kind: 'link',
      value: 'https://acme.io',
    })
    // An unquoted `[[Page]]` is a nested one-element list to yaml, and reads as the link it spells, whatever scalar yaml reads its title as.
    expect(decodeValue(def({ type: 'link' }), [['Page']])).toEqual({
      kind: 'link',
      value: '[[Page]]',
    })
    expect(decodeValue(def({ type: 'link' }), [[2024]])).toEqual({
      kind: 'link',
      value: '[[2024]]',
    })
    expect(decodeValue(def({ type: 'link' }), 42)).toEqual({ kind: 'null' })
    // A one-item list is a list, as the index reads it, not a link.
    expect(decodeValue(def({ type: 'link' }), ['Page'])).toEqual({ kind: 'null' })
    expect(decodeValue(def({ type: 'dateTime' }), '2026-06-15')).toEqual({
      kind: 'dateTime',
      value: '2026-06-15',
    })
    expect(decodeValue(multiSelectOf('a', 'b'), ['a', 'b'])).toEqual({
      kind: 'multiSelect',
      value: ['a', 'b'],
    })
  })

  it('a value whose shape contradicts its type reads as null, never as another type', () => {
    expect(decodeValue(def({ type: 'number' }), 'five')).toEqual({ kind: 'null' })
    expect(decodeValue(def({ type: 'multiSelect' }), { a: 1 })).toEqual({ kind: 'null' })
  })

  it('a YAML number or boolean names the option it spells — an outside `- 2024` is the option "2024"', () => {
    const year = def({
      type: 'select',
      select_options: [{ id: 'opt_2024', key: '2024', label: '2024' }],
    })
    expect(decodeValue(year, [2024])).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(year, 2024)).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(multiSelectOf('true', 'x'), [true, 'x'])).toEqual({
      kind: 'multiSelect',
      value: ['true', 'x'],
    })
  })

  it('an option type reads a scalar as a list of one', () => {
    expect(decodeValue(multiSelectOf('zeta'), 'zeta')).toEqual({
      kind: 'multiSelect',
      value: ['zeta'],
    })
    expect(decodeValue(selectDef, ['A'])).toEqual({ kind: 'select', value: 'A' })
    expect(decodeValue(statusDef, ['Done'])).toEqual({ kind: 'select', value: 'Done' })
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

  it("decodeValue's select case is that rule", () => {
    const options = (...values: string[]) =>
      def({
        type: 'select',
        select_options: values.map((value) => ({ id: `opt_${value}`, key: value, label: value })),
      })
    expect(decodeValue(options('Open', 'Active', 'Done'), ['Open', 'Active'])).toEqual({
      kind: 'select',
      value: 'Active',
    })
    expect(decodeValue(options('Red', 'Blue'), ['Green', 'Blue'])).toEqual({
      kind: 'select',
      value: 'Blue',
    })
    expect(decodeValue(options('Open', 'Active'), ['Active', 'Wip'])).toEqual({
      kind: 'select',
      value: 'Active',
    })
    expect(decodeValue(options('Open'), ['Wip'])).toEqual({ kind: 'null' })
    expect(decodeValue(options('Open'), [])).toEqual({ kind: 'null' })
  })
})

describe('decodeValue — lenient on read', () => {
  it('a select or status names only an option the schema still offers', () => {
    expect(decodeValue(selectDef, 'Gone')).toEqual({ kind: 'null' })
    expect(decodeValue(statusDef, 'Retired')).toEqual({ kind: 'null' })
    expect(decodeValue(selectDef, 'A')).toEqual({ kind: 'select', value: 'A' })
  })

  it('a multi-select drops a value the schema does not offer', () => {
    const d = multiSelectOf('A')
    expect(decodeValue(d, ['A', 'Gone'])).toEqual({ kind: 'multiSelect', value: ['A'] })
    expect(decodeValue(d, ['Gone'])).toEqual({ kind: 'null' })
  })

  it('an empty or spaces-only string reads as no value, whatever the type', () => {
    for (const type of ['text', 'dateTime', 'link', 'select', 'number', 'file'] as const)
      for (const raw of ['', '   '])
        expect(decodeValue(def({ type }), raw)).toEqual({ kind: 'null' })
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

  it('an entry nothing can spell is DROPPED — it never takes the rest of the list with it', () => {
    // A dangling `- ` under an attachment key is YAML null; nulling the whole value would blank the cell and let the next add write a one-entry list over references whose files are still on disk.
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

  it('drops a spaces-only entry and reads an entry listed twice once', () => {
    expect(decodeValue(fileDef, ['[[a.png]]', '   ', '[[a.png]]', '[[b.png]]'])).toEqual({
      kind: 'file',
      value: ['[[a.png]]', '[[b.png]]'],
    })
  })

  it('nothing left to name is nothing', () => {
    expect(decodeValue(fileDef, [])).toEqual({ kind: 'null' })
    expect(decodeValue(fileDef, [null, 2026])).toEqual({ kind: 'null' })
    expect(decodeValue(fileDef, ['[[a.pdf]]'])).toEqual({ kind: 'file', value: ['[[a.pdf]]'] })
    expect(isBlankValue(decodeValue(fileDef, []))).toBe(true)
  })
})

describe('encodeValue — bare on disk', () => {
  it('writes each option label’s key, a label no option holds as given, and every other kind as itself', () => {
    expect(encodeValue(keyedSelect, { kind: 'select', value: 'Done' })).toEqual(['done'])
    expect(
      encodeValue(keyedMulti, { kind: 'multiSelect', value: ['In Progress', 'Done'] }),
    ).toEqual(['in-progress', 'done'])
    expect(encodeValue(keyedSelect, { kind: 'select', value: 'Gone' })).toEqual(['Gone'])
    expect(encodeValue(def({ type: 'number' }), { kind: 'number', value: 42 })).toBe(42)
    expect(encodeValue(def({ type: 'checkbox' }), { kind: 'checkbox', value: true })).toBe(true)
    expect(encodeValue(def({ type: 'number' }), { kind: 'null' })).toBeNull()
  })

  it('round-trips every canonical shape through its own declared type', () => {
    const pairs: Array<[PropertyDefinition, unknown]> = [
      [def({ type: 'number' }), 42],
      [def({ type: 'checkbox' }), true],
      [def({ type: 'link' }), 'https://acme.io'],
      [def({ type: 'dateTime' }), '2026-06-15T14:30:00Z'],
      [selectDef, ['A']],
      [multiSelectOf('a', 'b'), ['a', 'b']],
      [statusDef, ['Done']],
      [keyedSelect, ['done']],
      [def({ type: 'file' }), ['[[y.png]]']],
    ]
    for (const [d, raw] of pairs) expect(encodeValue(d, decodeValue(d, raw))).toEqual(raw)
    expect(decodeValue(keyedSelect, ['done'])).toEqual({ kind: 'select', value: 'Done' })
  })

  it('a hand-edited unquoted wikilink encodes back as the string it meant', () => {
    const raw = [[['Report.pdf']]]
    const file = def({ type: 'file' })
    expect(encodeValue(file, decodeValue(file, raw))).toEqual(['[[Report.pdf]]'])
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
    { kind: 'link', value: '' },
    { kind: 'text', value: '' },
    { kind: 'dateTime', value: '' },
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

describe('options decode exactly; checkboxes without regard to case', () => {
  const stage = def({
    type: 'select',
    select_options: [
      { id: 'opt_Done', key: 'Done', label: 'Done' },
      { id: 'opt_Active', key: 'Active', label: 'Active' },
    ],
  })
  const labels = def({
    type: 'multiSelect',
    select_options: [
      { id: 'opt_Claude', key: 'Claude', label: 'Claude' },
      { id: 'opt_Docs', key: 'Docs', label: 'Docs' },
    ],
  })
  const checkbox = def({ type: 'checkbox' })

  it('a Select reads only an option written exactly as registered', () => {
    expect(decodeValue(stage, 'done')).toEqual({ kind: 'null' })
    expect(decodeValue(stage, ['done', 'Active'])).toEqual({ kind: 'select', value: 'Active' })
  })

  it('a Multi-Select reads each option written exactly and drops every other word', () => {
    expect(decodeValue(labels, ['claude', 'Docs', 'new'])).toEqual({
      kind: 'multiSelect',
      value: ['Docs'],
    })
  })

  it('a member held twice reads once', () => {
    expect(decodeValue(labels, ['Docs', 'new', 'Docs'])).toEqual({
      kind: 'multiSelect',
      value: ['Docs'],
    })
  })

  it('a checkbox reads a pair’s checked word in any casing as checked, and its partner or any other value as no value', () => {
    for (const raw of ['Yes', 'yes', 'TRUE', 'true', true, 'on', 'ON', 'y', 'Y'])
      expect(decodeValue(checkbox, raw)).toEqual({ kind: 'checkbox', value: true })
    for (const raw of ['No', 'off', 'n', 'false', '1', false, 1])
      expect(decodeValue(checkbox, raw)).toEqual({ kind: 'null' })
  })
})

describe('keepingForeignWords', () => {
  const tags = multiSelectOf('Work', 'Docs')

  it('joins the words no option names after the written ones', () => {
    expect(keepingForeignWords(tags, ['Work'], ['Docs', 'work', 'Ideas'])).toEqual([
      'Work',
      'work',
      'Ideas',
    ])
    expect(keepingForeignWords(tags, ['Ideas'], ['Ideas'])).toEqual(['Ideas'])
  })

  it('answers an emptied list and a Select value as given', () => {
    expect(keepingForeignWords(tags, [], ['Ideas'])).toEqual([])
    expect(keepingForeignWords(selectDef, ['A'], ['Ideas'])).toEqual(['A'])
  })

  it('keeps a held word no option’s key names after the written keys', () => {
    expect(keepingForeignWords(keyedMulti, ['done'], ['Doing'])).toEqual(['done', 'Doing'])
  })
})

describe('findOption', () => {
  const tag: PropertyDefinition = {
    id: 'prop_tag',
    label: 'Tag',
    key: 'Tag',
    type: 'select',
    select_options: [{ id: 'opt_opt_a', key: 'opt_a', label: 'opt_a', color: 'green' }],
  }
  it('returns the option with its color (the chip tint)', () => {
    expect(findOption(tag, 'opt_a')).toEqual({
      id: 'opt_opt_a',
      key: 'opt_a',
      label: 'opt_a',
      color: 'green',
    })
  })
  it('returns undefined for an unknown label', () => {
    expect(findOption(tag, 'nope')).toBeUndefined()
  })
})

describe('readNumber', () => {
  it('reads a YAML number as itself and a string as the number it spells', () => {
    expect(readNumber(42)).toBe(42)
    expect(readNumber('30')).toBe(30)
    expect(readNumber(' 3.5 ')).toBe(3.5)
    expect(readNumber('1,200')).toBe(1200)
    expect(readNumber('-1,200.50')).toBe(-1200.5)
    expect(readNumber('30%')).toBe(30)
    expect(readNumber('30 %')).toBe(30)
    expect(readNumber('$1,200')).toBe(1200)
    expect(readNumber('-$30')).toBe(-30)
    expect(readNumber('+$5')).toBe(5)
    expect(readNumber('CA$1,300.5')).toBe(1300.5)
    expect(readNumber('5A$')).toBe(5)
    expect(readNumber('30 €')).toBe(30)
    expect(readNumber('£ 7')).toBe(7)
    expect(readNumber('¥500')).toBe(500)
  })

  it('reads nothing from a value that spells no number', () => {
    for (const raw of [
      'five',
      '',
      '$',
      '%',
      '1,5',
      '12,34,567',
      '$30%',
      '-$-30',
      '30 USD',
      true,
      null,
      ['30'],
    ])
      expect(readNumber(raw)).toBeUndefined()
  })
})

describe('spelledNumber', () => {
  it('keeps the file’s spelling of an unchanged value', () => {
    expect(spelledNumber(30, '30.0')).toBe('30.0')
    expect(spelledNumber(1200, '$1,200.00')).toBe('$1,200.00')
  })

  it('a changed value keeps the string shape, symbol, percent sign, spacing, grouping, and decimal places, its digits typed', () => {
    expect(spelledNumber(1300, '$1,200.00')).toBe('$1,300.00')
    expect(spelledNumber(45.125, '30.50%')).toBe('45.125%')
    expect(spelledNumber(2, '1.000000000000000000001')).toBe('2.00000000000000000000')
    expect(spelledNumber(1234567, '1,200')).toBe('1,234,567')
    expect(spelledNumber(1234, '1200')).toBe('1234')
    expect(spelledNumber(45, '30%')).toBe('45%')
    expect(spelledNumber(-40, '$30')).toBe('-$40')
    expect(spelledNumber(31, '30 €')).toBe('31 €')
  })

  it('lands bare over anything but a string spelling a number, and where the spelling would not read back', () => {
    expect(spelledNumber(31, 30)).toBe(31)
    expect(spelledNumber(31, 'five')).toBe(31)
    expect(spelledNumber(1e-25, '$30')).toBe(1e-25)
  })
})
