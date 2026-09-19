import { describe, expect, it } from 'vitest'
import { easeBase, easeSnap } from './motion'

describe('the JS forms of the easing tokens', () => {
  it('tracks the curve `easing.baseEase` names', () => {
    for (const [t, y] of [
      [0.1, 0.095],
      [0.25, 0.409],
      [0.5, 0.802],
      [0.75, 0.96],
      [0.9, 0.994],
    ])
      expect(easeBase(t)).toBeCloseTo(y, 2)
  })

  it('tracks the curve `easing.baseSnap` names', () => {
    for (const [t, y] of [
      [0.1, 0.401],
      [0.25, 0.765],
      [0.5, 0.961],
      [0.75, 0.997],
    ])
      expect(easeSnap(t)).toBeCloseTo(y, 2)
  })

  it('spans 0 to 1 exactly', () => {
    for (const ease of [easeBase, easeSnap]) {
      expect(ease(0)).toBe(0)
      expect(ease(1)).toBe(1)
    }
  })
})
