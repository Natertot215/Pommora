import { describe, expect, it } from 'vitest'
import { DEFAULT_ZOOM, ZOOM_STEPS, scaleRows, zoomStep } from './tileZoom'

describe('tileZoom', () => {
  it('offers the shared ramp, high to low', () => {
    expect(ZOOM_STEPS).toEqual([1.5, 1.25, 1.1, 1, 0.9, 0.75, 0.65, 0.5])
  })

  it('builds the Scale rows in the kit factor spelling, the current step checked, each keeping the menu open', () => {
    const rows = scaleRows('zoom:', 0.9)
    expect(rows.map((r) => r.label)).toEqual([
      '1.50x',
      '1.25x',
      '1.10x',
      '1.00x',
      '0.90x',
      '0.75x',
      '0.65x',
      '0.50x',
    ])
    expect(rows.find((r) => r.checked)).toMatchObject({ action: 'zoom:0.9', stay: true })
    expect(rows.every((r) => r.stay)).toBe(true)
  })

  it('resolves an absent factor to the 1.0 step', () => {
    expect(zoomStep(undefined)).toBe(DEFAULT_ZOOM)
  })

  it('snaps an off-grid factor to the nearest step (hand-edit / import safety)', () => {
    expect(zoomStep(0.83)).toBe(0.9)
    expect(zoomStep(0.6)).toBe(0.65)
    expect(zoomStep(2)).toBe(1.5)
    expect(zoomStep(0.1)).toBe(0.5)
  })
})
