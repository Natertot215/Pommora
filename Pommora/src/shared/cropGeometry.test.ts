import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  coverStyle,
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  panDelta,
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

describe('panDelta', () => {
  const anchor: Crop = { x: 0.5, y: 0.5, zoom: 1.5 }

  it('reads the live zoom, not the anchor zoom, for the overhang', () => {
    const out = panDelta(anchor, 2, 2, 1, 100, 10, 0)
    expect(out.x).toBeCloseTo(0.4, 10)
    expect(out.y).toBe(0.5)
    expect(out.zoom).toBe(1.5)
  })

  it('returns exactly the anchor when the total delta is zero', () => {
    expect(panDelta(anchor, 2, 2, 1, 100, 0, 0)).toEqual(anchor)
  })

  it('leaves an axis untouched when its overhang is zero', () => {
    const out = panDelta({ x: 0.5, y: 0.5, zoom: 1 }, 1, 2, 1, 100, 40, 40)
    expect(out.x).toBe(0.5)
    expect(out.y).not.toBe(0.5)
  })

  it('falls back to the anchor on an unusable frame', () => {
    expect(panDelta(anchor, 2, 2, 1, 0, 10, 10)).toEqual(anchor)
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
