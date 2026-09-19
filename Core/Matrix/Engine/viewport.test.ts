import { describe, expect, it } from 'vitest'
import { fit, toScreen, toWorld, type Viewport, ZOOM_MAX, ZOOM_MIN, zoomAt } from './viewport'

const start: Viewport = { x: 10, y: -20, zoom: 1.5 }

describe('the viewport', () => {
  it('zoomAt holds the world point under the cursor still', () => {
    const [wx, wy] = toWorld(start, 300, 200)
    const zoomed = zoomAt(start, 300, 200, 1.4)
    const [ax, ay] = toWorld(zoomed, 300, 200)
    expect(ax).toBeCloseTo(wx)
    expect(ay).toBeCloseTo(wy)
  })

  it('zoomAt clamps at both ends', () => {
    expect(zoomAt(start, 0, 0, 100).zoom).toBe(ZOOM_MAX)
    expect(zoomAt(start, 0, 0, 0.0001).zoom).toBe(ZOOM_MIN)
  })

  it('fit centres a bounding box in a stage that does not start at the origin', () => {
    const stage = { x: 200, y: 100, width: 800, height: 600 }
    const v = fit({ x0: -100, y0: -50, x1: 100, y1: 50 }, stage)
    const [sx, sy] = toScreen(v, 0, 0)
    expect(sx).toBeCloseTo(stage.x + stage.width / 2)
    expect(sy).toBeCloseTo(stage.y + stage.height / 2)
    expect(v.zoom).toBeCloseTo(800 / 360)
  })
})
