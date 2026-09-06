import { describe, expect, it } from 'vitest'
import {
  PINK,
  RAMP_FAMILIES,
  RAMP_STEPS,
  SPECTRUM,
  isColorKey,
  mixAt,
  tintAt,
  type CellKey,
} from './colors'
import { vars as colorVars } from './color.css'
import { ANCHOR_CELLS, cellColor, cellPaint, cellRing, labelColorFor, solidColorCss } from './ramp'

const c = colorVars.color
const WHITE = c.system.white
const BLACK = c.system.black

// The five regularized rows must reproduce the ladder the sandbox settled by eye: 55 · 70 · 85 toward black, the anchor, then 85 · 70 · 55 · 40 toward white.
describe('the single-anchor rows reproduce the settled ladder', () => {
  const DARK = [55, 70, 85]
  const LIGHT = [85, 70, 55, 40]

  it.each(['red', 'orange', 'yellow', 'green', 'cyan'] as const)('%s', (family) => {
    const hex = c.solid[family]
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

// The blue row is the one the regularization MOVES — cells 0, 6 and 7 shift off the sandbox's hand-tuned 70 / 80 / 55 onto the shared ladder. Pinned so the move is deliberate, never drift.
describe('the paired blue row', () => {
  it('seats both anchors exactly', () => {
    expect(cellColor('blue-1')).toBe(c.solid.blue)
    expect(cellColor('blue-5')).toBe(c.solid.lightBlue)
  })

  it('rides the shared ladder at its ends', () => {
    expect(cellColor('blue-0')).toBe(`color-mix(in srgb, ${c.solid.blue} 85%, ${BLACK})`)
    expect(cellColor('blue-6')).toBe(`color-mix(in srgb, ${c.solid.lightBlue} 85%, ${WHITE})`)
    expect(cellColor('blue-7')).toBe(`color-mix(in srgb, ${c.solid.lightBlue} 70%, ${WHITE})`)
  })

  it('crosses in even oklch quarters', () => {
    for (const [step, pct] of [
      [2, 25],
      [3, 50],
      [4, 75],
    ] as const) {
      expect(cellColor(`blue-${step}` as CellKey)).toBe(
        `color-mix(in oklch, ${c.solid.lightBlue} ${pct}%, ${c.solid.blue})`,
      )
    }
  })
})

describe('anchors', () => {
  // Every anchor resolves to the design-system TOKEN, not the literal behind it, so a chip still indirects through --color-solid-* exactly as it did before the ramp existed.
  it('round-trips every spectrum solid back to its own token', () => {
    for (const key of Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]) {
      expect(cellColor(ANCHOR_CELLS[key])).toBe(c.solid[key])
    }
  })

  // grey-6 falls inside the darkness-offset zone, so a chip carrying the legacy `grey` renders a step darker than it did before the ramp. Pinned, not hidden.
  it('renders the grey anchor darker than the bare solid, per the greyscale exception', () => {
    expect(cellPaint(ANCHOR_CELLS.grey).base).toBe(mixAt(c.solid.grey, 85, BLACK))
  })

  it('seats pink at purple-5 without making it a spectrum solid', () => {
    expect(cellColor('purple-5')).toBe(PINK)
    expect(Object.keys(SPECTRUM)).not.toContain('pink')
  })
})

describe('cellPaint', () => {
  it('is the bare cell color off the grid, with no outline of its own', () => {
    expect(cellPaint('red-3')).toEqual({ base: c.solid.red })
  })

  it('darkens the base of the two brightest greys so their text still reads', () => {
    expect(cellPaint('grey-7').base).not.toBe(cellColor('grey-7'))
    expect(cellPaint('grey-6').base).not.toBe(cellColor('grey-6'))
    expect(cellPaint('grey-5').base).toBe(cellColor('grey-5'))
  })

  it('rides the label-tertiary ladder on every grey outline', () => {
    expect(cellPaint('grey-0').outline).toBe(tintAt(c.label.tertiary, 35))
    expect(cellPaint('grey-7').outline).toBe(c.label.tertiary)
  })
})

describe('cellRing', () => {
  it('is the solid at tint-primary on a chromatic row', () => {
    expect(cellRing('red-6')).toBe(tintAt(cellColor('red-6'), 'primary'))
  })

  it('is the chip border on the grey row, where they are one thing', () => {
    for (const step of RAMP_STEPS) {
      const key = `grey-${step}` as CellKey
      expect(cellRing(key)).toBe(cellPaint(key).outline)
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

// Generating the palette from the ramp may not move any of the ten anchors' rendered recipe. Grey is the one documented exception (see its own case above).
describe('the anchors survive the generation unchanged', () => {
  it('renders each chromatic anchor exactly as the bare solid did', () => {
    const chromatic = (Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]).filter(
      (k) => k !== 'grey',
    )
    for (const key of chromatic) {
      expect(cellPaint(ANCHOR_CELLS[key])).toEqual({ base: c.solid[key] })
    }
  })

  it('seats default on grey-4 so the two share one source', () => {
    expect(cellColor('grey-4')).toBe(c.solid.greyDefault)
  })
})

describe('labelColorFor', () => {
  it('normalizes every legacy solid name onto its anchor cell', () => {
    for (const key of Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]) {
      expect(labelColorFor(key)).toBe(ANCHOR_CELLS[key])
    }
  })

  it('passes every cell in the grid straight through', () => {
    for (const family of RAMP_FAMILIES) {
      for (const step of RAMP_STEPS) {
        expect(labelColorFor(`${family}-${step}`)).toBe(`${family}-${step}`)
      }
    }
  })

  // grey-4 shares `default`'s VALUE but is a cell a user can deliberately pick, so it must keep its own key — collapsing it would make that square unclearable in the picker.
  it('keeps grey-4 distinct from default', () => {
    expect(labelColorFor('grey-4')).toBe('grey-4')
  })

  it('falls back to default for absent or non-grammar names', () => {
    expect(labelColorFor(undefined)).toBe('default')
    expect(labelColorFor('chartreuse')).toBe('default')
    expect(labelColorFor('gray')).toBe('default')
    expect(labelColorFor('teal')).toBe('default')
    expect(labelColorFor('red-8')).toBe('default')
    expect(labelColorFor('')).toBe('default')
  })

  // The accent sentinel is produced by the two consumers that own the accent fallback; it must not round-trip in from disk.
  it('refuses the accent sentinel', () => {
    expect(labelColorFor('accent')).toBe('default')
  })
})

describe('solidColorCss', () => {
  it('falls back to the runtime accent when unset — the "Default" both editors label', () => {
    expect(solidColorCss(undefined)).toBe('var(--system-accent)')
  })

  it('resolves a legacy anchor name to its own solid', () => {
    expect(solidColorCss('red')).toBe(colorVars.color.solid.red)
    expect(solidColorCss('red')).toBe(cellColor(ANCHOR_CELLS.red))
  })

  // Before the ramp, a stepped key indexed a table holding only the ten solids and came back undefined — a link with no color, a checkbox with no fill.
  it('resolves a stepped cell key rather than coming back empty', () => {
    expect(solidColorCss('purple-6')).toBe(cellColor('purple-6'))
    expect(solidColorCss('purple-6')).toBeTruthy()
  })

  it('resolves grey-4 as the cell a user picked, not as the neutral fallback', () => {
    expect(solidColorCss('grey-4')).toBe(cellColor('grey-4'))
  })

  it('falls back to the neutral for a name outside the grammar', () => {
    expect(solidColorCss('chartreuse')).toBe(cellColor('grey-4'))
  })
})
