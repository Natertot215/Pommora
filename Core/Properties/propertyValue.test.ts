import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from './properties'
import type { KeyFormat } from './keyFormat'
import {
  applyValueAtRoot,
  decodeValue,
  encodeValue,
  findOption,
  writtenSpelling,
  isBlankValue,
  keepingForeignWords,
  reconcilePropertyValue,
  unregisteredMembers,
  type PropertyValue,
  gonePageEntry,
  frozenWorld,
} from './propertyValue'
import { buildPageIndex } from '../Connections/pageIndex'

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
        { key: 'Done', label: 'Done', group_id: 'g' },
        { key: 'Open', label: 'Open', group_id: 'g' },
      ],
    },
  ],
})

const selectDef = def({
  type: 'select',
  select_options: [
    { key: 'A', label: 'A' },
    { key: 'B', label: 'B' },
  ],
})

const multiSelectOf = (...values: string[]): PropertyDefinition =>
  def({
    type: 'multiSelect',
    select_options: values.map((value) => ({ key: value, label: value })),
  })

const keyedOptions = [
  { key: 'done', label: 'Done' },
  { key: 'in-progress', label: 'In Progress' },
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
        { key: '2024-01-01', label: '2024-01-01' },
        { key: 'https://acme.io', label: 'https://acme.io' },
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
    const year = def({ type: 'select', select_options: [{ key: '2024', label: '2024' }] })
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
      def({ type: 'select', select_options: values.map((value) => ({ key: value, label: value })) })
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

describe('reconcilePropertyValue — a frozen copy names only what still exists', () => {
  const link = def({ type: 'link' })
  const holds = (title: string): boolean => title === 'Alpha'

  it('keeps a Link value naming a page the world holds, whatever it carries', () => {
    const value = '[[Alpha#Intro|see]]'
    expect(reconcilePropertyValue(link, value, { holds })).toEqual({ kind: 'link', value })
  })

  it('drops a Link value naming a page the world doesn’t hold', () => {
    expect(reconcilePropertyValue(link, '[[Gone]]', { holds })).toEqual({ kind: 'null' })
  })

  it('drops a hand-written markdown link naming a page the world doesn’t hold, and keeps an address', () => {
    expect(reconcilePropertyValue(link, '[x](Gone)', { holds })).toEqual({ kind: 'null' })
    expect(reconcilePropertyValue(link, '[x](example.com)', { holds })).toEqual({
      kind: 'link',
      value: '[x](example.com)',
    })
  })

  it('keeps a Link value naming only a heading of the page it sits on', () => {
    const value = '[[#Intro]]'
    expect(reconcilePropertyValue(link, value, { holds })).toEqual({ kind: 'link', value })
  })

  it('keeps an address, and a live read or an options-only freeze keeps any page', () => {
    const url = 'https://example.com'
    expect(reconcilePropertyValue(link, url, { holds })).toEqual({ kind: 'link', value: url })
    expect(reconcilePropertyValue(link, '[[Gone]]')).toEqual({
      kind: 'link',
      value: '[[Gone]]',
    })
    expect(reconcilePropertyValue(link, '[[Gone]]', {})).toEqual({
      kind: 'link',
      value: '[[Gone]]',
    })
  })
})

describe('gonePageEntry — the entry a restore parks', () => {
  const gone = { holds: () => false }
  it('reads an unquoted `[[Page]]` as the entry it spells', () => {
    expect(gonePageEntry([['Gone']], gone)).toBe('[[Gone]]')
  })
  it('reads a hand-written markdown link to a page', () => {
    expect(gonePageEntry('[x](Gone)', gone)).toBe('[x](Gone)')
  })
  it('leaves an address, a bare heading, and a page the world holds', () => {
    expect(gonePageEntry('[x](example.com)', gone)).toBeNull()
    expect(gonePageEntry('[[#Intro]]', gone)).toBeNull()
    expect(gonePageEntry('[[Alpha]]', { holds: (t) => t === 'Alpha' })).toBeNull()
  })
})

describe('frozenWorld', () => {
  it('answers a recorded key by the page it named, and any other by the name', () => {
    const world = frozenWorld(
      buildPageIndex([
        { id: 'pA', title: 'A', path: 'Notes/A.md' },
        { id: 'pD', title: 'D', path: 'Notes/Deep/D.md' },
        { id: 'alpha0', title: 'Alpha', path: 'Notes/Alpha.md' },
        { id: 'back', title: 'Landing', path: 'Ideas/Old/Landing.md' },
      ]),
      new Map([
        ['old a', { id: 'pA' }],
        ['alpha', { id: 'gone' }],
      ]),
    )
    expect(world.holds?.('Ideas/Old/Landing')).toBe(true)
    expect(world.holds?.('landing')).toBe(true)
    expect(world.holds?.('Old A')).toBe(true)
    expect(world.holds?.('Alpha')).toBe(false)
    expect(world.holds?.('d')).toBe(true)
    expect(world.holds?.('ghost')).toBe(false)
  })
})

describe('applyValueAtRoot', () => {
  it('writes the exact key beside another casing, and a clear leaves that casing', () => {
    const status = { ...statusDef, label: 'Status', key: 'Status' }
    const done = { kind: 'select', value: 'Done' } as const
    expect(applyValueAtRoot({ status: 'Open' }, status, done)).toEqual({
      status: 'Open',
      Status: ['Done'],
    })
    expect(applyValueAtRoot({ status: 'Open' }, status, null)).toEqual({ status: 'Open' })
  })

  it('a Multi-Select pick keeps the words no option names after it, and a clear drops the key', () => {
    const tags = { ...multiSelectOf('Docs', 'Work'), label: 'Tags', key: 'Tags' }
    const picked: PropertyValue = { kind: 'multiSelect', value: ['Docs', 'Work'] }
    expect(applyValueAtRoot({ Tags: ['Docs', 'Ideas'] }, tags, picked)).toEqual({
      Tags: ['Docs', 'Work', 'Ideas'],
    })
    expect(applyValueAtRoot({ Tags: ['Docs', 'Ideas'] }, tags, null)).toEqual({})
  })
})

describe('writtenSpelling', () => {
  it('a string keeps a number, a list, and an unquoted wikilink the file spells when it reads as that text, and takes a typed string over anything else', () => {
    expect(writtenSpelling('42', 42)).toBe(42)
    expect(writtenSpelling('[milk, eggs]', ['milk', 'eggs'])).toEqual(['milk', 'eggs'])
    // The same link a Link key decodes an unquoted `[[Page]]` to, so re-saving it leaves the file alone; a different link lands as typed.
    expect(writtenSpelling('[[Page]]', [['Page']])).toEqual([['Page']])
    expect(writtenSpelling('[[007]]', [['007']])).toEqual([['007']])
    expect(writtenSpelling('[[Other|Page]]', [['Page']])).toBe('[[Other|Page]]')
    expect(writtenSpelling('forty-two', 42)).toBe('forty-two')
    expect(writtenSpelling('note', 'note')).toBe('note')
    expect(writtenSpelling('note', undefined)).toBe('note')
  })

  it('gives each member the one held member its title names exactly; a member held twice keeps the registered spelling', () => {
    expect(writtenSpelling(['Done'], ['done', 'Done'])).toEqual(['Done'])
    expect(writtenSpelling(['Done'], ['done', 'DONE'])).toEqual(['Done'])
    expect(writtenSpelling(['Done', 'Active'], 'done')).toEqual(['Done', 'Active'])
  })

  it('a member keeps the held member that names it, of any scalar shape or as an unquoted wikilink, and a whole unquoted wikilink stays whole', () => {
    expect(writtenSpelling(['2024'], [2024])).toEqual([2024])
    expect(writtenSpelling(['[[A.png]]'], [[['a.png']]])).toEqual(['[[A.png]]'])
    expect(writtenSpelling(['[[a.png]]'], [['a.png']])).toEqual([['a.png']])
    expect(writtenSpelling(['[[a.png]]', '[[b.png]]'], [['a.png']])).toEqual([
      '[[a.png]]',
      '[[b.png]]',
    ])
  })

  it('a checked value keeps the checked word the file holds, and takes its unchecked word’s partner in the same casing', () => {
    expect(writtenSpelling(true, 'Yes')).toBe('Yes')
    expect(writtenSpelling(true, 'no')).toBe('yes')
    expect(writtenSpelling(true, 'No')).toBe('Yes')
    expect(writtenSpelling(true, 'OFF')).toBe('ON')
    expect(writtenSpelling(true, 'N')).toBe('Y')
    expect(writtenSpelling(true, 'false')).toBe('true')
  })

  it('a checked value the file never held stays true', () => {
    expect(writtenSpelling(true, undefined)).toBe(true)
  })
})

describe('options decode exactly; checkboxes without regard to case', () => {
  const stage = def({
    type: 'select',
    select_options: [
      { key: 'Done', label: 'Done' },
      { key: 'Active', label: 'Active' },
    ],
  })
  const labels = def({
    type: 'multiSelect',
    select_options: [
      { key: 'Claude', label: 'Claude' },
      { key: 'Docs', label: 'Docs' },
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

  it('unregisteredMembers answers each word no option claims without regard to case, once by fold', () => {
    expect(unregisteredMembers(labels, ['CLAUDE', 'Ideas', 'ideas'])).toEqual(['Ideas'])
    expect(unregisteredMembers(multiSelectOf('red', 'blue'), ['green', 'Red', 'PURPLE'])).toEqual([
      'green',
      'PURPLE',
    ])
  })

  it('unregisteredMembers subtracts every word whose fold an option’s label or key holds', () => {
    expect(unregisteredMembers(keyedMulti, ['IN-PROGRESS', 'done', 'DONE', 'new'])).toEqual(['new'])
  })

  it('unregisteredMembers answers only the words the Value Format could have written', () => {
    const under = (value_format: KeyFormat, ...values: string[]): PropertyDefinition => ({
      ...multiSelectOf(...values),
      value_format,
    })
    expect(
      unregisteredMembers(under('lowercase', 'red', 'blue'), ['green', 'PURPLE', 'Red']),
    ).toEqual(['green'])
    expect(unregisteredMembers(under('kebab-case'), ['due_date', 'in-progress'])).toEqual([
      'in-progress',
    ])
    expect(unregisteredMembers(under('PascalCase'), ['AB', 'J.Crew', 'Red'])).toEqual(['Red'])
    expect(unregisteredMembers(under('lowercase'), ['Green', 'green'])).toEqual(['green'])
    expect(unregisteredMembers(under('lowercase'), [' green '])).toEqual([' green '])
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
    select_options: [{ key: 'opt_a', label: 'opt_a', color: 'green' }],
  }
  it('returns the option with its color (the chip tint)', () => {
    expect(findOption(tag, 'opt_a')).toEqual({ key: 'opt_a', label: 'opt_a', color: 'green' })
  })
  it('returns undefined for an unknown label', () => {
    expect(findOption(tag, 'nope')).toBeUndefined()
  })
})
