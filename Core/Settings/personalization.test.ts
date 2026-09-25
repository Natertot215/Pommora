import { describe, it, expect } from 'vitest'
import { readPersonalization } from './codec'
import {
  type Personalization,
  TAB_MIN_WIDTH,
  coerceHeadingSize,
  coerceTenthsScale,
  PREVIEW_LINGER_MS,
  SETTING_DEFAULTS,
} from './personalization'

describe('coerceTenthsScale', () => {
  it('clamps out-of-range values so a typo cannot brick the window', () => {
    expect(coerceTenthsScale(1.25)).toBe(1.25)
    expect(coerceTenthsScale(125)).toBe(1.5)
    expect(coerceTenthsScale(0.1)).toBe(0.5)
  })

  it('falls back to 1.0 on an absent or non-numeric value', () => {
    expect(coerceTenthsScale(undefined)).toBe(1)
    expect(coerceTenthsScale('big')).toBe(1)
  })
})

describe('readPersonalization previewPersistence', () => {
  it('passes a valid rung through', () => {
    expect(readPersonalization({ previewPersistence: '5s' }).previewPersistence).toBe('5s')
    expect(readPersonalization({ previewPersistence: 'off' }).previewPersistence).toBe('off')
    expect(readPersonalization({ previewPersistence: 'always' }).previewPersistence).toBe('always')
  })

  it('rejects junk and non-strings as undefined so the reader falls back to the default', () => {
    expect(
      readPersonalization({ previewPersistence: 'garbage' }).previewPersistence,
    ).toBeUndefined()
    expect(readPersonalization({ previewPersistence: 7 }).previewPersistence).toBeUndefined()
    expect(readPersonalization({}).previewPersistence).toBeUndefined()
  })

  it('the default rung is a valid value', () => {
    const rung = SETTING_DEFAULTS.previewPersistence
    expect(readPersonalization({ previewPersistence: rung }).previewPersistence).toBe(rung)
  })
})

describe('PREVIEW_LINGER_MS', () => {
  it('maps each rung to its grace in ms', () => {
    expect(PREVIEW_LINGER_MS['1s']).toBe(1000)
    expect(PREVIEW_LINGER_MS['5s']).toBe(5000)
    expect(PREVIEW_LINGER_MS['10s']).toBe(10000)
    expect(PREVIEW_LINGER_MS.always).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('readPersonalization heading link settings', () => {
  it('passes each valid headingLinkStyle and inPageHeadingResolution value through', () => {
    expect(readPersonalization({ headingLinkStyle: 'heading-only' }).headingLinkStyle).toBe(
      'heading-only',
    )
    expect(readPersonalization({ headingLinkStyle: 'page-heading' }).headingLinkStyle).toBe(
      'page-heading',
    )
    expect(
      readPersonalization({ inPageHeadingResolution: 'automatic' }).inPageHeadingResolution,
    ).toBe('automatic')
    expect(
      readPersonalization({ inPageHeadingResolution: 'explicit' }).inPageHeadingResolution,
    ).toBe('explicit')
  })

  it('drops junk values as undefined', () => {
    expect(readPersonalization({ headingLinkStyle: 'garbage' }).headingLinkStyle).toBeUndefined()
    expect(
      readPersonalization({ inPageHeadingResolution: 'garbage' }).inPageHeadingResolution,
    ).toBeUndefined()
  })
})

describe('readPersonalization matrixOpenIn', () => {
  it('passes either option through and drops a stranger', () => {
    expect(readPersonalization({ matrixOpenIn: 'window' }).matrixOpenIn).toBe('window')
    expect(readPersonalization({ matrixOpenIn: 'tab' }).matrixOpenIn).toBe('tab')
    expect(readPersonalization({ matrixOpenIn: 'garbage' }).matrixOpenIn).toBeUndefined()
    expect(readPersonalization({}).matrixOpenIn).toBeUndefined()
  })
})

describe('coerceHeadingSize', () => {
  it('clamps to the slider range and falls back on junk', () => {
    expect(coerceHeadingSize(1.6, 1.8)).toBe(1.6)
    expect(coerceHeadingSize(9, 1.8)).toBe(2.5)
    expect(coerceHeadingSize(0.1, 1.8)).toBe(0.5)
    expect(coerceHeadingSize('big', 1.8)).toBe(1.8)
  })

  it('reads only a stored number per level, clamped', () => {
    const p = readPersonalization({ heading2Size: 2, heading6Size: 7, heading3Size: 'x' })
    expect(p.heading2Size).toBe(2)
    expect(p.heading6Size).toBe(2.5)
    expect(p.heading3Size).toBeUndefined()
    expect(p.heading1Size).toBeUndefined()
  })
})

// One row per helper family at its boundaries. The schema is the only reader of the settings file, so a helper wired to the wrong literal, the wrong bound, or the wrong polarity would otherwise cost a setting silently and cost no test.
describe('every decode helper at its boundary', () => {
  const cases: [string, Record<string, unknown>, keyof Personalization, unknown][] = [
    ['flag keeps a stored boolean either way', { hideChevrons: true }, 'hideChevrons', true],
    ['flag keeps a stored false', { hideChevrons: false }, 'hideChevrons', false],
    ['flag drops a non-boolean', { hideChevrons: 'yes' }, 'hideChevrons', undefined],
    [
      'flag keeps a stored window-banner toggle',
      { windowPageBanners: true },
      'windowPageBanners',
      true,
    ],
    [
      'flag drops a non-boolean window-banner toggle',
      { windowSpaceBanners: 1 },
      'windowSpaceBanners',
      undefined,
    ],
    ['oneOf passes a member', { sidebarMode: 'contexts' }, 'sidebarMode', 'contexts'],
    ['oneOf drops a non-member', { sidebarMode: 'graph' }, 'sidebarMode', undefined],
    ['color passes a palette key', { accent: 'green' }, 'accent', 'green'],
    ['color passes its own inherit', { accent: 'system' }, 'accent', 'system'],
    ['color drops another field’s inherit', { accent: 'accent' }, 'accent', undefined],
    ['color drops a stranger', { accent: 'burnt-sienna' }, 'accent', undefined],
    ['stepped clamps above the ramp', { tabMinWidth: 9000 }, 'tabMinWidth', TAB_MIN_WIDTH.max],
    ['stepped clamps below the ramp', { tabMinWidth: 1 }, 'tabMinWidth', TAB_MIN_WIDTH.min],
    ['stepped rounds to a whole step', { tabMinWidth: 72.6 }, 'tabMinWidth', 73],
    ['stepped drops a non-number', { tabMinWidth: '80' }, 'tabMinWidth', undefined],
    ['scaled clamps to the scale ramp', { embedScale: 99 }, 'embedScale', 1.5],
    ['scaled drops a non-number', { embedScale: null }, 'embedScale', undefined],
    ['headingSize clamps to its ramp', { heading1Size: 0 }, 'heading1Size', 0.5],
    [
      'nonEmptyStrings drops the blanks',
      { ribbonOrder: ['a', '', 7, 'b'] },
      'ribbonOrder',
      ['a', 'b'],
    ],
    [
      'nonEmptyStrings reads an all-blank list as absent',
      { ribbonOrder: ['', 3] },
      'ribbonOrder',
      undefined,
    ],
    [
      'nonEmptyStrings reads an empty list as absent',
      { ribbonOrder: [] },
      'ribbonOrder',
      undefined,
    ],
    ['nonEmptyStrings drops a non-array', { ribbonOrder: 'a,b' }, 'ribbonOrder', undefined],
  ]
  for (const [name, raw, key, expected] of cases)
    it(name, () => expect(readPersonalization(raw)[key]).toEqual(expected))

  it('iconsByKind keeps the known kinds and drops the rest', () => {
    const icons = readPersonalization({
      defaultIcons: { collection: 'folder', page: '', nonsense: 'x', set: 7, space: 'box' },
    }).defaultIcons
    expect(icons).toEqual({ collection: 'folder', space: 'box' })
  })

  it('iconsByKind reads a map with nothing usable as absent', () => {
    expect(readPersonalization({ defaultIcons: { page: 7 } }).defaultIcons).toBeUndefined()
    expect(readPersonalization({ defaultIcons: [] }).defaultIcons).toBeUndefined()
  })

  it('a hostile settings blob never throws and yields no settings', () => {
    expect(readPersonalization(null)).toEqual({})
    expect(readPersonalization('nope')).toEqual({})
    expect(readPersonalization([1, 2])).toEqual({})
  })
})
