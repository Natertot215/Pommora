import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  DEFAULT_MATRIX_CONFIG,
  type MatrixConfig,
  parseMatrixConfig,
} from './matrixConfig'

describe('parseMatrixConfig', () => {
  it('reads an absent file as the defaults', () => {
    expect(parseMatrixConfig(null)).toEqual(DEFAULT_MATRIX_CONFIG)
  })

  it('keeps every other default beside a partial section', () => {
    const space = { ...DEFAULT_MATRIX_CONFIG.forces.space, spread: 2 }
    const config = parseMatrixConfig({ forces: { space } })
    expect(config.forces).toEqual({ ...DEFAULT_MATRIX_CONFIG.forces, space })
    expect(config.group).toEqual(DEFAULT_MATRIX_CONFIG.group)
    expect(config.filter).toEqual(DEFAULT_MATRIX_CONFIG.filter)
    expect(config.display).toEqual(DEFAULT_MATRIX_CONFIG.display)
  })

  it('clamps a force outside its range and refuses one that is not a number', () => {
    const forces = { location: { gravity: 10, spread: -2, distance: 'far' } }
    const config = parseMatrixConfig({ forces })
    expect(config.forces.location.gravity).toBe(2)
    expect(config.forces.location.spread).toBe(0.35)
    expect(config.forces.location.distance).toBe(DEFAULT_MATRIX_CONFIG.forces.location.distance)
  })

  it('seeds every grouping from one flat set, as a file written before the split carries it', () => {
    const config = parseMatrixConfig({ forces: { spread: 2 } })
    for (const set of Object.values(config.forces)) expect(set.spread).toBe(2)
  })

  it("lets a grouping's own value win over the flat set, key by key", () => {
    const config = parseMatrixConfig({ forces: { spread: 2, space: { gravity: 1.5 } } })
    expect(config.forces.space).toEqual({
      ...DEFAULT_MATRIX_CONFIG.forces.space,
      spread: 2,
      gravity: 1.5,
    })
  })

  it('leaves a grouping the file does not name at its own default', () => {
    const config = parseMatrixConfig({ forces: { space: { spread: 2 } } })
    expect(config.forces.space.spread).toBe(2)
    expect(config.forces.connection).toEqual(DEFAULT_MATRIX_CONFIG.forces.connection)
  })

  it('falls to the default mode for an unknown one', () => {
    expect(parseMatrixConfig({ group: { mode: 'orbit' } }).group.mode).toBe('connection')
    expect(parseMatrixConfig({ group: { mode: 'space' } }).group.mode).toBe('space')
  })

  it('reads rules that are not an object as null', () => {
    expect(parseMatrixConfig({ filter: { rules: 'all' } }).filter.rules).toBeNull()
    expect(parseMatrixConfig({ filter: { rules: [] } }).filter.rules).toBeNull()
    expect(parseMatrixConfig({ filter: { rules: { match: 'all' } } }).filter.rules).toBeNull()
  })

  it('keeps a well-formed group', () => {
    const rules = { match: 'all', rules: [] }
    expect(parseMatrixConfig({ filter: { rules } }).filter.rules).toEqual(rules)
  })
})

describe('applyPatch', () => {
  it('merges one section and returns the other three by reference', () => {
    const before: MatrixConfig = parseMatrixConfig(null)
    const after = applyPatch(before, { display: { unlinked: false } })
    expect(after.display).toEqual({ ...before.display, unlinked: false })
    expect(after.group).toBe(before.group)
    expect(after.filter).toBe(before.filter)
    expect(after.forces).toBe(before.forces)
  })
})
