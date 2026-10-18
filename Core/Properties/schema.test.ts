import { describe, it, expect } from 'vitest'
import {
  linkKeysOf,
  validateName,
  validateDefinition,
  validateOptionValues,
  withUniqueOptions,
} from './schema'
import { KEY_REFUSAL, type PropertyDefinition } from './properties'

const def = (
  over: Partial<PropertyDefinition> & {
    id: string
    label: string
    key: string
    type: PropertyDefinition['type']
  },
) => over as PropertyDefinition

describe('validateName', () => {
  const existing = [def({ id: 'p1', label: 'Stage', key: 'Stage', type: 'status' })]
  const both = (word: string) => ({ label: word, key: word })
  const refusalOf = (words: { label: string; key: string }, among = existing): string | null => {
    const r = validateName(words, among)
    return r.ok ? null : r.error.message
  }
  const refusal = (name: string): string | null => refusalOf(both(name))

  it('rejects a case-insensitive duplicate name (empty is the callers\u2019 gate)', () => {
    expect(refusal('stage')).toBe(KEY_REFUSAL.duplicate('stage'))
  })

  it('allows the same name when it is the excluded def (rename no-op)', () => {
    expect(validateName(both('Stage'), existing, 'p1').ok).toBe(true)
  })

  it('refuses a key another property writes in any casing', () => {
    const phase = [def({ id: 'p2', label: 'Phase', key: 'stage', type: 'status' })]
    expect(refusalOf(both('Stage'), phase)).toBe(KEY_REFUSAL.duplicateKey('Stage'))
  })

  it('refuses a reserved key or a reserved label', () => {
    expect(refusalOf({ label: 'My Banner', key: 'banner' })).toBe(KEY_REFUSAL.reserved('banner'))
    expect(refusalOf({ label: 'ID', key: 'x' })).toBe(KEY_REFUSAL.reserved('ID'))
  })

  it('refuses a label that leaves its key empty', () => {
    expect(refusalOf({ label: '---', key: '' })).toBe(KEY_REFUSAL.noKey)
  })

  it('refuses an empty name', () => {
    expect(refusal('')).toBe(KEY_REFUSAL.empty)
  })

  it('refuses the $ prefix and the Context sigil', () => {
    for (const name of ['$role', '<Foo', '$icon'])
      expect(refusal(name)).toBe(KEY_REFUSAL.reservedPrefix)
  })

  it('refuses a key Pommora manages in any casing', () => {
    for (const name of ['id', 'Id', 'BANNER', 'Heading_Icon_Hidden'])
      expect(refusal(name)).toBe(KEY_REFUSAL.reserved(name))
  })

  it('refuses a name every object already answers to, in its exact spelling only', () => {
    for (const name of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'])
      expect(refusal(name)).toBe(KEY_REFUSAL.reserved(name))
  })

  it('takes ordinary names, PageID, modified_at, and Constructor among them', () => {
    for (const name of ['Budget ($)', 'icon', 'PageID', 'modified_at', 'Constructor'])
      expect(refusal(name)).toBeNull()
  })
})

describe('validateDefinition', () => {
  const existing = [def({ id: 'p1', label: 'Stage', key: 'Stage', type: 'status' })]

  it('refuses the type a Context column wears', () => {
    expect(
      validateDefinition(def({ id: 'p5', label: 'Area', key: 'Area', type: 'context' }), existing)
        .ok,
    ).toBe(false)
  })

  it('refuses the types the timestamp columns wear', () => {
    for (const type of ['createdTime', 'lastEditedTime'] as const)
      expect(
        validateDefinition(def({ id: 'p6', label: 'When', key: 'When', type }), existing).ok,
      ).toBe(false)
  })

  it('blocks reserved ids and duplicate ids', () => {
    expect(
      validateDefinition(def({ id: '_title', label: 'X', key: 'X', type: 'number' }), existing).ok,
    ).toBe(false)
    expect(
      validateDefinition(def({ id: 'p1', label: 'New', key: 'New', type: 'number' }), existing).ok,
    ).toBe(false)
  })

  it('rejects duplicate select option values', () => {
    const dupOpts = def({
      id: 'p3',
      label: 'Tag2',
      key: 'Tag2',
      type: 'select',
      select_options: [
        { key: 'a', label: 'a' },
        { key: 'a', label: 'a' },
      ],
    })
    expect(validateDefinition(dupOpts, existing).ok).toBe(false)
  })

  const status = (options: { key: string; label: string }[]) =>
    def({
      id: 'p6',
      label: 'Phase',
      key: 'Phase',
      type: 'status',
      status_groups: [
        {
          id: 'upcoming',
          label: 'Upcoming',
          color: 'grey',
          options: options.slice(0, 1).map((o) => ({ ...o, group_id: 'upcoming' })),
        },
        {
          id: 'done',
          label: 'Done',
          color: 'green',
          options: options.slice(1).map((o) => ({ ...o, group_id: 'done' })),
        },
      ],
    })
  const refusalOf = (d: PropertyDefinition): string | null => {
    const r = validateDefinition(d, existing)
    return r.ok ? null : r.error.message
  }

  it('checks a Status property\u2019s options at create', () => {
    expect(
      refusalOf(
        status([
          { key: 'Done', label: 'Done' },
          { key: 'done', label: 'done' },
        ]),
      ),
    ).toBe('Option titles must be unique.')
    expect(refusalOf(status([{ key: ' ', label: 'Open' }]))).toBe(
      'Options cannot contain an invalid name.',
    )
  })

  it('allows a zero-option select (no floor)', () => {
    expect(
      validateDefinition(
        def({ id: 'p2', label: 'Tag', key: 'Tag', type: 'select', select_options: [] }),
        existing,
      ).ok,
    ).toBe(true)
    expect(
      validateDefinition(def({ id: 'p4', label: 'Tag3', key: 'Tag3', type: 'select' }), existing)
        .ok,
    ).toBe(true)
  })

  it('accepts a valid new property', () => {
    expect(
      validateDefinition(def({ id: 'p9', label: 'Score', key: 'Score', type: 'number' }), existing)
        .ok,
    ).toBe(true)
  })
})

describe('validateOptionValues', () => {
  it('rejects duplicate titles, accepts unique', () => {
    expect(
      validateOptionValues([
        { key: 'A', label: 'A' },
        { key: 'A', label: 'A' },
      ]).ok,
    ).toBe(false)
    expect(
      validateOptionValues([
        { key: 'A', label: 'A' },
        { key: 'B', label: 'B' },
      ]).ok,
    ).toBe(true)
    expect(validateOptionValues([]).ok).toBe(true)
  })

  const refusalOf = (options: { key: string; label: string }[]): string | null => {
    const r = validateOptionValues(options)
    return r.ok ? null : r.error.message
  }

  it('refuses two keys that fold alike', () => {
    const pair = [
      { key: 'A', label: 'A' },
      { key: 'a', label: 'B' },
    ]
    expect(refusalOf(pair)).toBe(
      'An option with this title already exists, please choose another name.',
    )
  })

  it('refuses a blank key', () => {
    expect(refusalOf([{ key: '', label: 'A' }])).toBe('Options cannot contain an invalid name.')
  })

  it('compares titles without regard to case', () => {
    expect(
      validateOptionValues([
        { key: 'Done', label: 'Done' },
        { key: 'done', label: 'done' },
      ]).ok,
    ).toBe(false)
    expect(
      validateOptionValues([
        { key: 'done', label: 'done' },
        { key: 'Open', label: 'Open' },
      ]).ok,
    ).toBe(true)
  })
})

describe('withUniqueOptions', () => {
  const select = (select_options: { key: string; label: string }[]) =>
    def({ id: 'p1', label: 'Tag', key: 'Tag', type: 'select', select_options })

  it('keeps the first of two options whose keys fold alike', () => {
    expect(
      withUniqueOptions(
        select([
          { key: 'x', label: 'A' },
          { key: 'X', label: 'B' },
        ]),
      ).select_options,
    ).toEqual([{ key: 'x', label: 'A' }])
  })

  it('keeps an option whose key clashed only with one already dropped', () => {
    expect(
      withUniqueOptions(
        select([
          { key: '1', label: 'x' },
          { key: '1', label: 'y' },
          { key: '2', label: 'y' },
        ]),
      ).select_options,
    ).toEqual([
      { key: '1', label: 'x' },
      { key: '2', label: 'y' },
    ])
  })

  it('drops an option with a blank key', () => {
    expect(
      withUniqueOptions(
        select([
          { key: 'a', label: 'A' },
          { key: '', label: 'C' },
        ]),
      ).select_options,
    ).toEqual([{ key: 'a', label: 'A' }])
  })
})

describe('linkKeysOf', () => {
  const typed = (name: string, type: PropertyDefinition['type']) =>
    linkKeysOf([def({ id: 'p1', label: name, key: name, type })])(name)

  it('a Link or Text key holds links; a File, Number, or Select key never does', () => {
    expect(typed('Source', 'link')).toBe(true)
    expect(typed('Note', 'text')).toBe(true)
    expect(typed('Files', 'file')).toBe(false)
    expect(typed('Rank', 'number')).toBe(false)
    expect(typed('Stage', 'select')).toBe(false)
  })

  it('a key the registry hasn’t typed holds links unless Pommora keeps it', () => {
    const holds = linkKeysOf([])
    expect(holds('Related')).toBe(true)
    for (const key of ['ID', 'banner', '<Areas>', '$x']) expect(holds(key)).toBe(false)
  })

  it('asks the registry by exact key, another casing reading as untyped', () => {
    const holds = linkKeysOf([def({ id: 'p1', label: 'Rank', key: 'Rank', type: 'number' })])
    expect(holds('rank')).toBe(true)
    expect(holds('Rank')).toBe(false)
    expect(holds('Related')).toBe(true)
  })
})
