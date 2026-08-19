import { describe, expect, it } from 'vitest'
import { PINK, RAMP_FAMILIES, RAMP_STEPS, SPECTRUM, isColorKey, type CellKey } from '@shared/theme'
import { vars as colorVars } from './color.css'
import { ANCHOR_CELLS, cellColor, cellRing, cellTint } from './ramp'
import { TINT_STEPS, mixAt, tint, tintAt } from './tint'

const c = colorVars.color
const WHITE = c.system.white
const BLACK = c.system.black

describe('mixAt', () => {
  it('mixes toward an arbitrary color, not just transparent', () => {
    expect(mixAt('#FFF', 40, '#000')).toBe('color-mix(in srgb, #FFF 40%, #000)')
  })

  it('honors the oklch space', () => {
    expect(mixAt('#FFF', 25, '#000', 'oklch')).toBe('color-mix(in oklch, #FFF 25%, #000)')
  })

  it('returns the bare base at full strength', () => {
    expect(mixAt('#FFF', 100, '#000')).toBe('#FFF')
    expect(tintAt('#FFF', TINT_STEPS.solid)).toBe('#FFF')
  })
})

// The five regularized rows must reproduce the ladder the sandbox settled by eye: 55 · 70 · 85
// toward black, the anchor, then 85 · 70 · 55 · 40 toward white.
describe('the single-anchor rows reproduce the settled ladder', () => {
  const DARK = [55, 70, 85]
  const LIGHT = [85, 70, 55, 40]

  it.each(['red', 'orange', 'yellow', 'green', 'cyan'] as const)('%s', (family) => {
    const hex = SPECTRUM[family]
    DARK.forEach((pct, i) => {
      expect(cellColor(`${family}-${i}` as CellKey)).toBe(
        `color-mix(in srgb, ${hex} ${pct}%, ${BLACK})`,
      )
    })
    expect(cellColor(`${family}-3` as CellKey)).toBe(hex)
    LIGHT.forEach((pct, i) => {
      expect(cellColor(`${family}-${i + 4}` as CellKey)).toBe(
        `color-mix(in srgb, ${hex} ${pct}%, ${WHITE})`,
      )
    })
  })
})

// The blue row is the one the regularization MOVES — cells 0, 6 and 7 shift off the sandbox's
// hand-tuned 70 / 80 / 55 onto the shared ladder. Pinned so the move is deliberate, never drift.
describe('the paired blue row', () => {
  it('seats both anchors exactly', () => {
    expect(cellColor('blue-1')).toBe(SPECTRUM.blue)
    expect(cellColor('blue-5')).toBe(SPECTRUM.lightBlue)
  })

  it('rides the shared ladder at its ends', () => {
    expect(cellColor('blue-0')).toBe(`color-mix(in srgb, ${SPECTRUM.blue} 85%, ${BLACK})`)
    expect(cellColor('blue-6')).toBe(`color-mix(in srgb, ${SPECTRUM.lightBlue} 85%, ${WHITE})`)
    expect(cellColor('blue-7')).toBe(`color-mix(in srgb, ${SPECTRUM.lightBlue} 70%, ${WHITE})`)
  })

  it('crosses in even oklch quarters', () => {
    for (const [step, pct] of [
      [2, 25],
      [3, 50],
      [4, 75],
    ] as const) {
      expect(cellColor(`blue-${step}` as CellKey)).toBe(
        `color-mix(in oklch, ${SPECTRUM.lightBlue} ${pct}%, ${SPECTRUM.blue})`,
      )
    }
  })
})

describe('anchors', () => {
  it('round-trips every chromatic solid back to its own hex', () => {
    const chromatic = (Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]).filter(
      (k) => k !== 'grey',
    )
    for (const key of chromatic) {
      expect(cellColor(ANCHOR_CELLS[key])).toBe(SPECTRUM[key])
    }
  })

  // The greyscale row is a TOKEN ladder, so its anchor is the solid's var rather than the literal
  // both resolve to. Same painted color; different string.
  it('seats grey on its token', () => {
    expect(cellColor(ANCHOR_CELLS.grey)).toBe(c.solid.grey)
  })

  // Consequence of that seat: grey-6 falls inside the darkness-offset zone, so a chip carrying the
  // legacy `grey` renders a step darker than it did before the ramp. Pinned, not hidden.
  it('renders the grey anchor darker than the bare solid, per the greyscale exception', () => {
    expect(cellTint(ANCHOR_CELLS.grey)).not.toEqual(tint(c.solid.grey))
    expect(cellTint(ANCHOR_CELLS.grey).background).toBe(
      tint(mixAt(c.solid.grey, 85, BLACK)).background,
    )
  })

  it('seats pink at purple-5 without making it a spectrum solid', () => {
    expect(cellColor('purple-5')).toBe(PINK)
    expect(Object.keys(SPECTRUM)).not.toContain('pink')
  })
})

describe('cellTint', () => {
  it('is the plain chip recipe off the grid', () => {
    expect(cellTint('red-3')).toEqual(tint(SPECTRUM.red))
  })

  it('darkens the base of the two brightest greys so their text still reads', () => {
    expect(cellTint('grey-7')).not.toEqual(tint(cellColor('grey-7')))
    expect(cellTint('grey-6')).not.toEqual(tint(cellColor('grey-6')))
    expect(cellTint('grey-5').background).toBe(tint(cellColor('grey-5')).background)
  })

  it('rides the label-tertiary ladder on every grey border', () => {
    expect(cellTint('grey-0').borderColor).toBe(tintAt(c.label.tertiary, 35))
    expect(cellTint('grey-7').borderColor).toBe(c.label.tertiary)
  })
})

describe('cellRing', () => {
  it('is the solid at tint-primary on a chromatic row', () => {
    expect(cellRing('red-6')).toBe(tintAt(cellColor('red-6'), TINT_STEPS.primary))
  })

  it('is the chip border on the grey row, where they are one thing', () => {
    for (const step of RAMP_STEPS) {
      const key = `grey-${step}` as CellKey
      expect(cellRing(key)).toBe(cellTint(key).borderColor)
    }
  })
})

describe('isColorKey', () => {
  it('accepts every cell in the grid', () => {
    for (const family of RAMP_FAMILIES) {
      for (const step of RAMP_STEPS) expect(isColorKey(`${family}-${step}`)).toBe(true)
    }
  })

  it('accepts the ten bare anchor names still on disk', () => {
    for (const key of Object.keys(SPECTRUM)) expect(isColorKey(key)).toBe(true)
  })

  it('refuses malformed keys by membership rather than coercion', () => {
    for (const bad of ['', 'red-', 'red-8', 'red-01', '-3', 'Red-3', 'chartreuse', 'grey-4-2']) {
      expect(isColorKey(bad)).toBe(false)
    }
  })
})

// The refactor's baseline invariant: generating the palette from the ramp may not move any of the
// ten anchors' rendered recipe. Grey is the one documented exception (see its own case above).
describe('the anchors survive the generation unchanged', () => {
  it('renders each chromatic anchor exactly as the bare solid did', () => {
    const chromatic = (Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]).filter(
      (k) => k !== 'grey',
    )
    for (const key of chromatic) {
      expect(cellTint(ANCHOR_CELLS[key])).toEqual(tint(SPECTRUM[key]))
    }
  })

  it('seats default on grey-4 so the two share one source', () => {
    expect(cellColor('grey-4')).toBe(c.solid.greyDefault)
  })
})
