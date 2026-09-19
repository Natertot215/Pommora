import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  DEFAULT_MATRIX_CONFIG,
  FORCE_RANGE,
  type MatrixConfig,
  parseMatrixConfig,
} from './matrixConfig'

describe('parseMatrixConfig', () => {
  it('reads an absent file as the defaults', () => {
    expect(parseMatrixConfig(null)).toEqual(DEFAULT_MATRIX_CONFIG)
  })

  it('keeps every other default beside a partial section', () => {
    const config = parseMatrixConfig({ forces: { spread: 2 } })
    expect(config.forces).toEqual({ ...DEFAULT_MATRIX_CONFIG.forces, spread: 2 })
    expect(config.group).toEqual(DEFAULT_MATRIX_CONFIG.group)
    expect(config.filter).toEqual(DEFAULT_MATRIX_CONFIG.filter)
    expect(config.display).toEqual(DEFAULT_MATRIX_CONFIG.display)
  })

  it('clamps a force outside its range and refuses one that is not a number', () => {
    const config = parseMatrixConfig({ forces: { gravity: 10, spread: -2, distance: 'far' } })
    expect(config.forces.gravity).toBe(FORCE_RANGE[1])
    expect(config.forces.spread).toBe(FORCE_RANGE[0])
    expect(config.forces.distance).toBe(DEFAULT_MATRIX_CONFIG.forces.distance)
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
