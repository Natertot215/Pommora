import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  coverStyle,
  cropWindow,
  DEFAULT_CROP,
  dragWindow,
  MAX_ZOOM,
  MIN_ZOOM,
  panToCrop,
} from './cropGeometry'
import { cropKeyFor } from './nexusPaths'
import type { Crop } from './schemas'

describe('coverStyle', () => {
  it('fills width when the image is taller than the box relative to width', () => {
    expect(coverStyle(DEFAULT_CROP, 2, 1)).toEqual({
      backgroundSize: '100% auto',
      backgroundPosition: '50% 50%',
      backgroundColor: '',
    })
  })

  it('fills height when the image is wider than the box relative to width', () => {
    expect(coverStyle(DEFAULT_CROP, 1, 2)).toEqual({
      backgroundSize: 'auto 100%',
      backgroundPosition: '50% 50%',
      backgroundColor: '',
    })
  })

  it('takes the height branch at the equal-aspect boundary (never rides float noise)', () => {
    expect(coverStyle(DEFAULT_CROP, 1, 1)?.backgroundSize).toBe('auto 100%')
  })

  it('carries the zoom into the filling axis', () => {
    expect(coverStyle({ x: 0.5, y: 0.5, zoom: 2 }, 2, 1)?.backgroundSize).toBe('200% auto')
    expect(coverStyle({ x: 0.5, y: 0.5, zoom: 0.6 }, 1, 2)?.backgroundSize).toBe('auto 60%')
  })

  it('clamps an out-of-bounds zoom and repairs a NaN zoom to 1', () => {
    expect(coverStyle({ x: 0.5, y: 0.5, zoom: 10 }, 2, 1)?.backgroundSize).toBe(
      `${MAX_ZOOM * 100}% auto`,
    )
    expect(coverStyle({ x: 0.5, y: 0.5, zoom: 0.01 }, 2, 1)?.backgroundSize).toBe(
      `${MIN_ZOOM * 100}% auto`,
    )
    expect(coverStyle({ x: 0.5, y: 0.5, zoom: Number.NaN }, 2, 1)?.backgroundSize).toBe('100% auto')
  })

  it('clamps the focal point into [0, 1] and paints the colour', () => {
    expect(coverStyle({ x: -1, y: 2, zoom: 1, color: '#123456' }, 2, 1)).toEqual({
      backgroundSize: '100% auto',
      backgroundPosition: '0% 100%',
      backgroundColor: '#123456',
    })
  })

  it('is null where either aspect is unusable', () => {
    expect(coverStyle(DEFAULT_CROP, 0, 1)).toBeNull()
    expect(coverStyle(DEFAULT_CROP, 1, 0)).toBeNull()
    expect(coverStyle(DEFAULT_CROP, -1, 1)).toBeNull()
    expect(coverStyle(DEFAULT_CROP, Number.NaN, 1)).toBeNull()
  })

  it('is cover centered at DEFAULT_CROP for every aspect pair (the must-agree table)', () => {
    const aspects = [1, 230 / 900, 104 / 180]
    for (const a of aspects) {
      for (const b of aspects) {
        const style = coverStyle(DEFAULT_CROP, a, b)
        expect(style).not.toBeNull()
        expect(style?.backgroundPosition).toBe('50% 50%')
        expect(style?.backgroundColor).toBe('')
        expect(style?.backgroundSize).toBe(a > b ? '100% auto' : 'auto 100%')
      }
    }
  })
})

describe('clampZoom', () => {
  it('holds the range at both ends', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM)
    expect(clampZoom(99)).toBe(MAX_ZOOM)
    expect(clampZoom(1.5)).toBe(1.5)
  })
})

describe('panToCrop', () => {
  it('clamps the focal point at both ends', () => {
    expect(panToCrop({ x: 0.5, y: 0.5, zoom: 1 }, 1, 1)).toEqual({ x: 1, y: 1, zoom: 1 })
    expect(panToCrop({ x: 0.5, y: 0.5, zoom: 1 }, -1, -1)).toEqual({ x: 0, y: 0, zoom: 1 })
  })
})

describe('cropWindow', () => {
  it('is the whole image for a matching seat at zoom 1', () => {
    expect(cropWindow({ x: 0.5, y: 0.5, zoom: 1 }, 1, 1)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })
  })

  it('a wide seat over a square image takes the full width and a centered band', () => {
    expect(cropWindow({ x: 0.5, y: 0.5, zoom: 1 }, 1, 0.5)).toEqual({
      left: 0,
      top: 0.25,
      width: 1,
      height: 0.5,
    })
  })

  it('zoom shrinks the window and the focal point places it', () => {
    expect(cropWindow({ x: 1, y: 1, zoom: 2 }, 1, 1)).toEqual({
      left: 0.5,
      top: 0.5,
      width: 0.5,
      height: 0.5,
    })
  })

  it('is the whole image where either aspect is unusable', () => {
    expect(cropWindow({ x: 0.5, y: 0.5, zoom: 2 }, 0, 1)).toEqual({
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })
  })
})

describe('dragWindow', () => {
  const anchor: Crop = { x: 0.5, y: 0.5, zoom: 2 }

  it('walks the focal point across the room the window leaves', () => {
    const out = dragWindow(anchor, 1, 1, 100, 100, 10, 0)
    expect(out.x).toBeCloseTo(0.7, 10)
    expect(out.y).toBe(0.5)
    expect(out.zoom).toBe(2)
  })

  it('returns exactly the anchor for a zero delta', () => {
    expect(dragWindow(anchor, 1, 1, 100, 100, 0, 0)).toEqual(anchor)
  })

  it('leaves an axis fixed when the window fills it (no room to move)', () => {
    const out = dragWindow({ x: 0.5, y: 0.5, zoom: 1 }, 1, 1, 100, 100, 40, 40)
    expect(out).toEqual({ x: 0.5, y: 0.5, zoom: 1 })
  })

  it('falls back to the anchor on an unusable frame', () => {
    expect(dragWindow(anchor, 1, 1, 0, 100, 10, 10)).toEqual(anchor)
  })
})

describe('cropKeyFor', () => {
  it('keys a file by its resolved nexus-relative path', () => {
    expect(cropKeyFor('Assets/Banner.png', '[[Banner.png]]')).toBe('Assets/Banner.png')
  })

  it('keys a web address by its raw string', () => {
    expect(cropKeyFor(null, 'https://example.com/a.png')).toBe('https://example.com/a.png')
  })

  it('is null for a value that resolves to neither a file nor a web address', () => {
    expect(cropKeyFor(null, 'Banner.png')).toBeNull()
    expect(cropKeyFor(null, '')).toBeNull()
  })
})
