import { describe, expect, it } from 'vitest'
import { DEFAULT_ZOOM, ZOOM_STEPS, zoomStep, zoomStyle } from './tileZoom'

describe('tileZoom', () => {
  it('offers the shared ramp, high to low', () => {
    expect(ZOOM_STEPS.map((s) => s.factor)).toEqual([1.5, 1.25, 1.1, 1, 0.9, 0.75, 0.65, 0.5])
  })

  it('derives both spellings', () => {
    expect(zoomStep(1)).toMatchObject({ factor: DEFAULT_ZOOM, inline: '1x', label: '1.00x' })
    expect(zoomStep(0.9)).toMatchObject({ inline: '0.9x', label: '0.90x' })
    expect(zoomStep(0.5)).toMatchObject({ inline: '0.5x', label: '0.50x' })
  })

  it('styles every step but 1.0 with the one variable, identity-stable per step', () => {
    expect(zoomStyle(1)).toBeUndefined()
    expect(zoomStyle(undefined)).toBeUndefined()
    expect(zoomStyle(0.9)).toEqual({ '--tile-zoom': 0.9 })
    expect(zoomStyle(0.83)).toBe(zoomStyle(0.9))
  })

  it('resolves an absent factor to the 1.0 step', () => {
    expect(zoomStep(undefined).factor).toBe(1)
  })

  it('snaps an off-grid factor to the nearest step (hand-edit / import safety)', () => {
    expect(zoomStep(0.83).factor).toBe(0.9)
    expect(zoomStep(0.6).factor).toBe(0.65)
    expect(zoomStep(2).factor).toBe(1.5) // above the max clamps down
    expect(zoomStep(0.1).factor).toBe(0.5) // below the min clamps up
  })
})
