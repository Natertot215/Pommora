import { describe, expect, it } from 'vitest'
import {
  fit,
  type Lens,
  lensViewport,
  lifeSize,
  panLens,
  type Stage,
  toScreen,
  toWorld,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomLens,
} from './viewport'

const WIDE: Stage = { x: 334, y: 38, width: 1380, height: 1050 }
const TIGHT: Stage = { x: 24, y: 38, width: 800, height: 470 }
const lens: Lens = { cx: 40, cy: -15, w: 2000, h: 1500 }

describe('the viewport', () => {
  it('zoomLens holds the world point under the cursor still', () => {
    const [wx, wy] = toWorld(lensViewport(lens, WIDE), 300, 200)
    const after = lensViewport(zoomLens(lens, WIDE, 300, 200, 1.4), WIDE)
    const [ax, ay] = toWorld(after, 300, 200)
    expect(ax).toBeCloseTo(wx)
    expect(ay).toBeCloseTo(wy)
    expect(after.zoom).toBeCloseTo(lensViewport(lens, WIDE).zoom * 1.4)
  })

  it('zoomLens clamps at both ends', () => {
    expect(lensViewport(zoomLens(lens, WIDE, 0, 0, 1000), WIDE).zoom).toBeCloseTo(ZOOM_MAX)
    expect(lensViewport(zoomLens(lens, WIDE, 0, 0, 0.0001), WIDE).zoom).toBeCloseTo(ZOOM_MIN)
  })

  // The lens carries no surface's aspect, so one surface driving it cannot resize another's picture.
  it('a pan or a zoom on one stage leaves another stage its scale', () => {
    const held = lensViewport(lens, TIGHT).zoom
    expect(lensViewport(panLens(lens, WIDE, 120, -60), TIGHT).zoom).toBeCloseTo(held)
    const zoomed = zoomLens(lens, WIDE, 300, 200, 1.4)
    expect(lensViewport(zoomed, TIGHT).zoom).toBeCloseTo(held * 1.4)
  })

  it('a pan moves the picture by the screen distance it was dragged', () => {
    const before = lensViewport(lens, WIDE)
    const after = lensViewport(panLens(lens, WIDE, 120, -60), WIDE)
    const [bx, by] = toScreen(before, 0, 0)
    const [ax, ay] = toScreen(after, 0, 0)
    expect(ax - bx).toBeCloseTo(120)
    expect(ay - by).toBeCloseTo(-60)
  })

  it('lifeSize makes a lens of a stage at its own scale', () => {
    const v = lensViewport(lifeSize(WIDE), WIDE)
    expect(v.zoom).toBe(1)
    const [sx, sy] = toScreen(v, 0, 0)
    expect(sx).toBeCloseTo(WIDE.x + WIDE.width / 2)
    expect(sy).toBeCloseTo(WIDE.y + WIDE.height / 2)
  })

  it('a stage pinned at a clamp moves no other stage', () => {
    const tiny: Lens = { cx: 0, cy: 0, w: WIDE.width / ZOOM_MIN, h: WIDE.height / ZOOM_MIN }
    expect(lensViewport(tiny, WIDE).zoom).toBeCloseTo(ZOOM_MIN)
    expect(zoomLens(tiny, WIDE, 0, 0, 0.5)).toBe(tiny)
  })

  it('fit centres a bounding box in a stage that does not start at the origin', () => {
    const stage: Stage = { x: 200, y: 100, width: 800, height: 600 }
    const v = lensViewport(fit({ x0: -100, y0: -50, x1: 100, y1: 50 }), stage)
    const [sx, sy] = toScreen(v, 0, 0)
    expect(sx).toBeCloseTo(stage.x + stage.width / 2)
    expect(sy).toBeCloseTo(stage.y + stage.height / 2)
    expect(v.zoom).toBeCloseTo(800 / 360)
  })
})
