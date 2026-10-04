import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from './properties'
import {
  applyValueAtRoot,
  decodeValue,
  encodeValue,
  heldSpelling,
  isBlankValue,
  reconcilePropertyValue,
  registeredOption,
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
        { value: 'Done', group_id: 'g' },
        { value: 'Open', group_id: 'g' },
      ],
    },
  ],
})

const selectDef = def({
  type: 'select',
  select_options: [{ value: 'A' }, { value: 'B' }],
})

describe('decodeValue — the declared type decides, never the shape', () => {
  it('reads a status value as its bare label', () => {
    expect(decodeValue(statusDef, 'Done')).toEqual({ kind: 'select', value: 'Done' })
  })

  it('never guesses: a select option shaped like a date or a url stays a select', () => {
    const shaped = def({
      type: 'select',
      select_options: [{ value: '2024-01-01' }, { value: 'https://acme.io' }],
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
    expect(decodeValue(def({ type: 'dateTime' }), '2026-06-15')).toEqual({
      kind: 'dateTime',
      value: '2026-06-15',
    })
    expect(decodeValue(def({ type: 'multiSelect' }), ['a', 'b'])).toEqual({
      kind: 'multiSelect',
      value: ['a', 'b'],
    })
  })

  it('a value whose shape contradicts its type reads as null, never as another type', () => {
    expect(decodeValue(def({ type: 'number' }), 'five')).toEqual({ kind: 'null' })
    expect(decodeValue(def({ type: 'multiSelect' }), { a: 1 })).toEqual({ kind: 'null' })
  })

  it('a checkbox is true or absent — false written from outside reads as no value', () => {
    expect(decodeValue(def({ type: 'checkbox' }), false)).toEqual({ kind: 'null' })
  })

  it('a YAML number or boolean names the option it spells — an outside `- 2024` is the option "2024"', () => {
    const year = def({ type: 'select', select_options: [{ value: '2024' }] })
    expect(decodeValue(year, [2024])).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(year, 2024)).toEqual({ kind: 'select', value: '2024' })
    expect(decodeValue(def({ type: 'multiSelect' }), [true, 'x'])).toEqual({
      kind: 'multiSelect',
      value: ['true', 'x'],
    })
  })

  it('an option type reads a scalar as a list of one', () => {
    expect(decodeValue(def({ type: 'multiSelect' }), 'zeta')).toEqual({
      kind: 'multiSelect',
      value: ['zeta'],
    })
    expect(decodeValue(selectDef, ['A'])).toEqual({ kind: 'select', value: 'A' })
    expect(decodeValue(statusDef, ['Done'])).toEqual({ kind: 'select', value: 'Done' })
  })

  it('both stamp types decode as a dateTime', () => {
    expect(decodeValue(def({ type: 'lastEditedTime' }), '2026-06-15T14:30:00Z')).toEqual({
      kind: 'dateTime',
      value: '2026-06-15T14:30:00Z',
    })
    expect(decodeValue(def({ type: 'createdTime' }), '2026-06-15T14:30:00Z')).toEqual({
      kind: 'dateTime',
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

  it("decodeValue's select case is that rule", () => {
    const options = (...values: string[]) =>
      def({ type: 'select', select_options: values.map((value) => ({ value })) })
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

  it('a multi-select keeps a value the schema does not offer yet', () => {
    const d = def({ type: 'multiSelect', select_options: [{ value: 'A' }] })
    expect(decodeValue(d, ['A', 'Gone'])).toEqual({ kind: 'multiSelect', value: ['A', 'Gone'] })
    expect(decodeValue(d, ['Gone'])).toEqual({ kind: 'multiSelect', value: ['Gone'] })
  })

  it('an empty string is a link value', () => {
    expect(decodeValue(def({ type: 'link' }), '')).toEqual({ kind: 'link', value: '' })
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

  it('nothing left to name is nothing', () => {
    expect(decodeValue(fileDef, [])).toEqual({ kind: 'null' })
    expect(decodeValue(fileDef, [null, 2026])).toEqual({ kind: 'null' })
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
      [def({ type: 'link' }), 'https://acme.io'],
      [def({ type: 'dateTime' }), '2026-06-15T14:30:00Z'],
      [selectDef, ['A']],
      [def({ type: 'multiSelect' }), ['a', 'b']],
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
    { kind: 'link', value: '' },
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

describe('reconcilePropertyValue — a frozen copy names only what still exists', () => {
  const link = def({ type: 'link' })
  const holds = (title: string): boolean => title === 'Alpha'

  it('keeps a Link value naming a page the world holds, whatever it carries', () => {
    const value = '[[Alpha#Intro|see]]'
    expect(reconcilePropertyValue(link, value, { holds }).value).toEqual({ kind: 'link', value })
  })

  it('drops a Link value naming a page the world doesn’t hold', () => {
    expect(reconcilePropertyValue(link, '[[Gone]]', { holds }).value).toEqual({ kind: 'null' })
  })

  it('keeps a Link value naming only a heading of the page it sits on', () => {
    const value = '[[#Intro]]'
    expect(reconcilePropertyValue(link, value, { holds }).value).toEqual({ kind: 'link', value })
  })

  it('keeps an address, and a live read or an options-only freeze keeps any page', () => {
    const url = 'https://example.com'
    expect(reconcilePropertyValue(link, url, { holds }).value).toEqual({ kind: 'link', value: url })
    expect(reconcilePropertyValue(link, '[[Gone]]').value).toEqual({
      kind: 'link',
      value: '[[Gone]]',
    })
    expect(reconcilePropertyValue(link, '[[Gone]]', {}).value).toEqual({
      kind: 'link',
      value: '[[Gone]]',
    })
  })
})

describe('applyValueAtRoot', () => {
  it('writes and clears the spelling the root holds', () => {
    const status = { ...statusDef, name: 'Status' }
    const done = { kind: 'select', value: 'Done' } as const
    expect(applyValueAtRoot({ status: 'Open' }, status, done)).toEqual({ status: ['Done'] })
    expect(applyValueAtRoot({ status: 'Open' }, status, null)).toEqual({})
  })
})

describe('heldSpelling — a value spelled as the file already spells it', () => {
  it('gives each member a held member its title folds to, each used once', () => {
    expect(heldSpelling(['Done', 'Done'], ['done', 'Done'])).toEqual(['done', 'Done'])
    expect(heldSpelling(['Done', 'Active'], 'done')).toEqual(['done', 'Active'])
  })

  it('takes only string members', () => {
    expect(heldSpelling(['2024'], [2024])).toEqual(['2024'])
  })

  it('a checked value the file never held stays true', () => {
    expect(heldSpelling(true, undefined)).toBe(true)
  })
})

describe('options and checkboxes decode without regard to case', () => {
  const stage = def({ type: 'select', select_options: [{ value: 'Done' }, { value: 'Active' }] })
  const labels = def({
    type: 'multiSelect',
    select_options: [{ value: 'Claude' }, { value: 'Docs' }],
  })
  const checkbox = def({ type: 'checkbox' })

  it('a Select reads a written option as the registered spelling', () => {
    expect(decodeValue(stage, 'done')).toEqual({ kind: 'select', value: 'Done' })
    expect(decodeValue(stage, ['done', 'Active'])).toEqual({ kind: 'select', value: 'Active' })
  })

  it('a Multi-Select reads each registered member as its option and adopts only the rest', () => {
    const raw = ['claude', 'Docs', 'new']
    expect(decodeValue(labels, raw)).toEqual({
      kind: 'multiSelect',
      value: ['Claude', 'Docs', 'new'],
    })
    expect(reconcilePropertyValue(labels, raw).adoptions).toEqual([
      { propertyId: 'p', value: 'new' },
    ])
  })

  it('a checkbox reads true, or the word true or yes in any casing, as checked', () => {
    for (const raw of ['Yes', 'yes', 'TRUE', 'true', true])
      expect(decodeValue(checkbox, raw)).toEqual({ kind: 'checkbox', value: true })
    for (const raw of ['No', '1', false, 1])
      expect(decodeValue(checkbox, raw)).toEqual({ kind: 'null' })
  })

  it('a checked value keeps the checked word the file holds', () => {
    expect(heldSpelling(true, 'Yes')).toBe('Yes')
  })

  it("registeredOption answers the definition's own spelling for any casing", () => {
    expect(registeredOption(stage, 'DONE')).toBe('Done')
    expect(registeredOption(stage, 'active')).toBe('Active')
    expect(registeredOption(stage, 'Gone')).toBeUndefined()
  })
})
