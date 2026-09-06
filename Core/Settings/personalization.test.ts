import { describe, it, expect } from 'vitest'
import {
  PREVIEW_PERSISTENCE_DEFAULT,
  coercePreviewPersistence,
  previewLingerMs,
} from './personalization'

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
