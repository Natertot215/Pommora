import { describe, it, expect } from 'vitest'
import { MARK_BOX, markDiscs, markRings } from '@pommora/uix/Symbols/mark'
import { logoSvg } from './logoSvg'

describe('the Pommora mark', () => {
  it('draws the 19-dot lattice inside its box', () => {
    const discs = markDiscs('icon')
    expect(discs).toHaveLength(19)
    for (const { cx, cy, r } of discs) {
      expect(cx - r).toBeGreaterThanOrEqual(0)
      expect(cx + r).toBeLessThanOrEqual(MARK_BOX)
      expect(cy - r).toBeGreaterThanOrEqual(0)
      expect(cy + r).toBeLessThanOrEqual(MARK_BOX)
    }
  })

  it('gives the logo and the icon one footprint — the ring ends where the icon disc does', () => {
    const icon = markDiscs('icon')
    markRings().forEach(({ r, w }, i) => {
      expect(r + w / 2).toBeCloseTo(icon[i].r, 10)
    })
  })

  it('compounds the ring with the dot, heaviest at the core', () => {
    const [core, inner] = markRings()
    const outer = markRings().at(-1)
    expect(core.w).toBeGreaterThan(inner.w)
    expect(inner.w).toBeGreaterThan(outer?.w ?? Number.POSITIVE_INFINITY)
  })
})

describe('logoSvg', () => {
  it('emits discs only for the icon, and discs plus rings for the logo', () => {
    expect(logoSvg('icon').match(/<circle/g)).toHaveLength(19)
    expect(logoSvg('logo').match(/<circle/g)).toHaveLength(38)
    expect(logoSvg('icon')).not.toContain('stroke')
  })

  it('takes an explicit fill for surfaces with no currentColor to inherit', () => {
    expect(logoSvg('logo', '#fff')).toContain('fill="#fff"')
    expect(logoSvg('logo', '#fff')).toContain('stroke="#fff"')
  })
})
