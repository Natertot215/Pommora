import { describe, it, expect } from 'vitest'
import { readPersonalization } from './codec'
import {
  PREVIEW_PERSISTENCE_DEFAULT,
  coerceHeadingSize,
  coerceInterfaceScale,
  coercePreviewPersistence,
  previewLingerMs,
} from './personalization'

describe('coerceInterfaceScale', () => {
  it('clamps out-of-range values so a typo cannot brick the window', () => {
    expect(coerceInterfaceScale(1.25)).toBe(1.25)
    expect(coerceInterfaceScale(125)).toBe(1.5)
    expect(coerceInterfaceScale(0.1)).toBe(0.5)
  })

  it('falls back to 1.0 on an absent or non-numeric value', () => {
    expect(coerceInterfaceScale(undefined)).toBe(1)
    expect(coerceInterfaceScale('big')).toBe(1)
  })
})

describe('coercePreviewPersistence', () => {
  it('passes a valid rung through', () => {
    expect(coercePreviewPersistence('5s')).toBe('5s')
    expect(coercePreviewPersistence('off')).toBe('off')
    expect(coercePreviewPersistence('always')).toBe('always')
  })

  it('rejects junk and non-strings as undefined so the reader falls back to the default', () => {
    expect(coercePreviewPersistence('garbage')).toBeUndefined()
    expect(coercePreviewPersistence(7)).toBeUndefined()
    expect(coercePreviewPersistence(undefined)).toBeUndefined()
  })

  it('the default rung is a valid value', () => {
    expect(coercePreviewPersistence(PREVIEW_PERSISTENCE_DEFAULT)).toBe(PREVIEW_PERSISTENCE_DEFAULT)
  })
})

describe('previewLingerMs', () => {
  it('maps each rung to its grace in ms', () => {
    expect(previewLingerMs('1s')).toBe(1000)
    expect(previewLingerMs('5s')).toBe(5000)
    expect(previewLingerMs('10s')).toBe(10000)
    expect(previewLingerMs('always')).toBe(Number.POSITIVE_INFINITY)
  })

  it('undefined resolves to the 1s default grace', () => {
    expect(previewLingerMs(undefined)).toBe(1000)
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
  it('passes Window through and leaves the tab default unwritten', () => {
    expect(readPersonalization({ matrixOpenIn: 'window' }).matrixOpenIn).toBe('window')
    expect(readPersonalization({ matrixOpenIn: 'tab' }).matrixOpenIn).toBeUndefined()
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
