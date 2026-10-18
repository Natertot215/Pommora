import { describe, it, expect } from 'vitest'
import { linkKeysOf, validateName, validateDefinition, validateOptionValues } from './schema'
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
