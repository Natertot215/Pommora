import { describe, expect, it } from 'vitest'
import {
  fit,
  type Frame,
  framed,
  panFrame,
  type Stage,
  toScreen,
  toWorld,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomFrame,
} from './viewport'

const WIDE: Stage = { x: 334, y: 38, width: 1380, height: 1050 }
const TIGHT: Stage = { x: 24, y: 38, width: 800, height: 470 }
const frame: Frame = { cx: 40, cy: -15, w: 2000, h: 1500 }

describe('the viewport', () => {
  it('zoomFrame holds the world point under the cursor still', () => {
    const [wx, wy] = toWorld(framed(frame, WIDE), 300, 200)
    const after = framed(zoomFrame(frame, WIDE, 300, 200, 1.4), WIDE)
    const [ax, ay] = toWorld(after, 300, 200)
    expect(ax).toBeCloseTo(wx)
    expect(ay).toBeCloseTo(wy)
    expect(after.zoom).toBeCloseTo(framed(frame, WIDE).zoom * 1.4)
  })

  it('zoomFrame clamps at both ends', () => {
    expect(framed(zoomFrame(frame, WIDE, 0, 0, 1000), WIDE).zoom).toBeCloseTo(ZOOM_MAX)
    expect(framed(zoomFrame(frame, WIDE, 0, 0, 0.0001), WIDE).zoom).toBeCloseTo(ZOOM_MIN)
  })

  // The frame carries no surface's aspect, so one surface driving it cannot resize another's picture.
  it('a pan or a zoom on one stage leaves another stage its scale', () => {
    const held = framed(frame, TIGHT).zoom
    expect(framed(panFrame(frame, WIDE, 120, -60), TIGHT).zoom).toBeCloseTo(held)
    const zoomed = zoomFrame(frame, WIDE, 300, 200, 1.4)
    expect(framed(zoomed, TIGHT).zoom).toBeCloseTo(held * 1.4)
  })

  it('a pan moves the picture by the screen distance it was dragged', () => {
    const before = framed(frame, WIDE)
    const after = framed(panFrame(frame, WIDE, 120, -60), WIDE)
    const [bx, by] = toScreen(before, 0, 0)
    const [ax, ay] = toScreen(after, 0, 0)
    expect(ax - bx).toBeCloseTo(120)
    expect(ay - by).toBeCloseTo(-60)
  })

  // A frame nothing has fitted yet shows the world at life size; a gesture on it has to mint a real extent rather than scale a zero one.
  it('a gesture on an unset frame takes the stage extent and moves the picture', () => {
    const unset: Frame = { cx: 0, cy: 0, w: 0, h: 0 }
    expect(framed(unset, WIDE).zoom).toBe(1)
    const panned = panFrame(unset, WIDE, 40, 0)
    expect(panned.w).toBe(WIDE.width)
    expect(framed(panned, WIDE).zoom).toBe(1)
    const zoomed = zoomFrame(unset, WIDE, 100, 100, 1.5)
    expect(framed(zoomed, WIDE).zoom).toBeCloseTo(1.5)
  })

  it('a stage pinned at a clamp moves no other stage', () => {
    const tiny: Frame = { cx: 0, cy: 0, w: WIDE.width / ZOOM_MIN, h: WIDE.height / ZOOM_MIN }
    expect(framed(tiny, WIDE).zoom).toBeCloseTo(ZOOM_MIN)
    expect(zoomFrame(tiny, WIDE, 0, 0, 0.5)).toBe(tiny)
  })

  it('fit centres a bounding box in a stage that does not start at the origin', () => {
    const stage: Stage = { x: 200, y: 100, width: 800, height: 600 }
    const v = framed(fit({ x0: -100, y0: -50, x1: 100, y1: 50 }), stage)
    const [sx, sy] = toScreen(v, 0, 0)
    expect(sx).toBeCloseTo(stage.x + stage.width / 2)
    expect(sy).toBeCloseTo(stage.y + stage.height / 2)
    expect(v.zoom).toBeCloseTo(800 / 360)
  })
})
