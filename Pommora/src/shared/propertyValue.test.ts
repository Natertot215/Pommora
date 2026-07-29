import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from './properties'
import { decodeValue, encodeValue, isBlankValue, type PropertyValue } from './propertyValue'

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
    expect(decodeValue(selectDef, '2024-01-01')).toEqual({ kind: 'select', value: '2024-01-01' })
    expect(decodeValue(selectDef, 'https://acme.io')).toEqual({
      kind: 'select',
      value: 'https://acme.io',
    })
  })

  it('reads each declared type from its own bare shape', () => {
    expect(decodeValue(def({ type: 'number' }), 42)).toEqual({ kind: 'number', value: 42 })
    expect(decodeValue(def({ type: 'number' }), 0)).toEqual({ kind: 'number', value: 0 })
    expect(decodeValue(def({ type: 'checkbox' }), false)).toEqual({
      kind: 'checkbox',
      value: false,
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
    expect(decodeValue(def({ type: 'multi_select' }), 'a')).toEqual({ kind: 'null' })
  })

  it('last_edited_time reads a stored stamp; it is encode that refuses to persist one', () => {
    expect(decodeValue(def({ type: 'last_edited_time' }), '2026-06-15T14:30:00Z')).toEqual({
      kind: 'datetime',
      value: '2026-06-15T14:30:00Z',
    })
    expect(() => encodeValue({ kind: 'lastEditedTime' })).toThrow()
  })
})

describe('decodeValue — lenient on read, strict on restore', () => {
  it('lenient keeps an option the schema no longer knows, so the cell still shows its text', () => {
    expect(decodeValue(selectDef, 'Gone')).toEqual({ kind: 'select', value: 'Gone' })
    expect(decodeValue(statusDef, 'Retired')).toEqual({ kind: 'select', value: 'Retired' })
  })

  it('strict refuses what the schema cannot validate', () => {
    expect(decodeValue(selectDef, 'Gone', { strict: true })).toEqual({ kind: 'null' })
    expect(decodeValue(statusDef, 'Retired', { strict: true })).toEqual({ kind: 'null' })
    expect(decodeValue(selectDef, 'A', { strict: true })).toEqual({ kind: 'select', value: 'A' })
  })

  it('strict intersects a multi-select, dropping only what the schema lost', () => {
    const d = def({ type: 'multi_select', select_options: [{ value: 'A', label: 'A' }] })
    expect(decodeValue(d, ['A', 'Gone'], { strict: true })).toEqual({
      kind: 'multiSelect',
      value: ['A'],
    })
    expect(decodeValue(d, ['Gone'], { strict: true })).toEqual({ kind: 'null' })
  })

  it('strict refuses an empty string where lenient keeps it', () => {
    expect(decodeValue(def({ type: 'url' }), '')).toEqual({ kind: 'url', value: '' })
    expect(decodeValue(def({ type: 'url' }), '', { strict: true })).toEqual({ kind: 'null' })
  })
})

describe('encodeValue — bare on disk', () => {
  it('writes the value itself, with no tag wrapping it', () => {
    expect(encodeValue({ kind: 'select', value: 'Done' })).toBe('Done')
    expect(encodeValue({ kind: 'number', value: 42 })).toBe(42)
    expect(encodeValue({ kind: 'checkbox', value: false })).toBe(false)
    expect(encodeValue({ kind: 'multiSelect', value: ['a'] })).toEqual(['a'])
    expect(encodeValue({ kind: 'null' })).toBeNull()
  })

  it('round-trips every canonical shape through its own declared type', () => {
    const pairs: Array<[PropertyDefinition, unknown]> = [
      [def({ type: 'number' }), 42],
      [def({ type: 'checkbox' }), true],
      [def({ type: 'url' }), 'https://acme.io'],
      [def({ type: 'datetime' }), '2026-06-15T14:30:00Z'],
      [selectDef, 'A'],
      [def({ type: 'multi_select' }), ['a', 'b']],
      [statusDef, 'Done'],
      [def({ type: 'file' }), [{ path: 'x/y.png', original_name: 'y.png' }]],
    ]
    for (const [d, raw] of pairs) expect(encodeValue(decodeValue(d, raw))).toEqual(raw)
  })

  it('a file object keeps keys the codec does not model', () => {
    const raw = [{ path: 'x.png', future_field: 1 }]
    expect(encodeValue(decodeValue(def({ type: 'file' }), raw))).toEqual(raw)
  })

  it('encoding lastEditedTime throws — it is virtual and must never persist', () => {
    expect(() => encodeValue({ kind: 'lastEditedTime' })).toThrow()
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

  it('checkbox false and number 0 are real values, not blanks', () => {
    expect(isBlankValue({ kind: 'checkbox', value: false })).toBe(false)
    expect(isBlankValue({ kind: 'number', value: 0 })).toBe(false)
  })
})
