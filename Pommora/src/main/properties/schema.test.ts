import { describe, it, expect } from 'vitest'
import { validateName, validateDefinition, validateOptionValues } from './schema'
import type { PropertyDefinition } from '@shared/properties'

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
})

describe('validateDefinition', () => {
  const existing = [def({ id: 'p1', name: 'Stage', type: 'status' })]

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
      select_options: [
        { value: 'a', label: 'A' },
        { value: 'a', label: 'A2' },
      ],
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
})
