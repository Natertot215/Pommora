import { describe, it, expect } from 'vitest'
import {
  holdsLinks,
  linkKeysOf,
  validateName,
  validateDefinition,
  validateOptionValues,
} from './schema'
import { KEY_REFUSAL, type PropertyDefinition } from './properties'

const def = (
  over: Partial<PropertyDefinition> & {
    id: string
    name: string
    type: PropertyDefinition['type']
  },
) => over as PropertyDefinition

describe('validateName', () => {
  const existing = [def({ id: 'p1', name: 'Stage', type: 'status' })]

  it('rejects a case-insensitive duplicate name (empty is the callers\u2019 gate)', () => {
    expect(validateName('stage', existing).ok).toBe(false)
  })

  it('allows the same name when it is the excluded def (rename no-op)', () => {
    expect(validateName('Stage', existing, 'p1').ok).toBe(true)
  })

  const refusal = (name: string): string | null => {
    const r = validateName(name, existing)
    return r.ok ? null : r.error.message
  }

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

  it('takes ordinary names, PageID and modified_at among them', () => {
    for (const name of ['Budget ($)', 'icon', 'PageID', 'modified_at'])
      expect(refusal(name)).toBeNull()
  })
})

describe('validateDefinition', () => {
  const existing = [def({ id: 'p1', name: 'Stage', type: 'status' })]

  it('refuses the type a Context column wears', () => {
    expect(validateDefinition(def({ id: 'p5', name: 'Area', type: 'context' }), existing).ok).toBe(
      false,
    )
  })

  it('refuses the types the timestamp columns wear', () => {
    for (const type of ['createdTime', 'lastEditedTime'] as const)
      expect(validateDefinition(def({ id: 'p6', name: 'When', type }), existing).ok).toBe(false)
  })

  it('blocks reserved ids and duplicate ids', () => {
    expect(validateDefinition(def({ id: '_title', name: 'X', type: 'number' }), existing).ok).toBe(
      false,
    )
    expect(validateDefinition(def({ id: 'p1', name: 'New', type: 'number' }), existing).ok).toBe(
      false,
    )
  })

  it('rejects duplicate select option values', () => {
    const dupOpts = def({
      id: 'p3',
      name: 'Tag2',
      type: 'select',
      select_options: [{ value: 'a' }, { value: 'a' }],
    })
    expect(validateDefinition(dupOpts, existing).ok).toBe(false)
  })

  it('allows a zero-option select (no floor)', () => {
    expect(
      validateDefinition(
        def({ id: 'p2', name: 'Tag', type: 'select', select_options: [] }),
        existing,
      ).ok,
    ).toBe(true)
    expect(validateDefinition(def({ id: 'p4', name: 'Tag3', type: 'select' }), existing).ok).toBe(
      true,
    )
  })

  it('accepts a valid new property', () => {
    expect(validateDefinition(def({ id: 'p9', name: 'Score', type: 'number' }), existing).ok).toBe(
      true,
    )
  })
})

describe('validateOptionValues', () => {
  it('rejects duplicate titles, accepts unique', () => {
    expect(validateOptionValues([{ value: 'A' }, { value: 'A' }]).ok).toBe(false)
    expect(validateOptionValues([{ value: 'A' }, { value: 'B' }]).ok).toBe(true)
    expect(validateOptionValues([]).ok).toBe(true)
  })

  it('compares titles without regard to case', () => {
    expect(validateOptionValues([{ value: 'Done' }, { value: 'done' }]).ok).toBe(false)
    expect(validateOptionValues([{ value: 'done' }, { value: 'Open' }]).ok).toBe(true)
  })
})

describe('holdsLinks', () => {
  it('a Link or Text key holds links; a File, Number, or Select key never does', () => {
    expect(holdsLinks('Source', 'link')).toBe(true)
    expect(holdsLinks('Notes', 'text')).toBe(true)
    for (const type of ['file', 'number', 'select'] as const)
      expect(holdsLinks('Related', type)).toBe(false)
  })

  it('an unregistered key holds links unless Pommora keeps it', () => {
    expect(holdsLinks('Related', undefined)).toBe(true)
    for (const key of ['ID', 'banner', '<Areas>', '$icon'])
      expect(holdsLinks(key, undefined)).toBe(false)
  })

  it('linkKeysOf asks the registry by folded name', () => {
    const holds = linkKeysOf([def({ id: 'p1', name: 'Number', type: 'number' })])
    expect(holds('number')).toBe(false)
    expect(holds('Related')).toBe(true)
  })
})
