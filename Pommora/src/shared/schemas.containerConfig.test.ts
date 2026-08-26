import { describe, it, expect } from 'vitest'
import { coerceOpenIn, coerceViewButton, pageCollectionSidecar, pageSetSidecar } from './schemas'

describe('open_in coercion', () => {
  it('passes valid values through and drops junk / absent', () => {
    expect(coerceOpenIn('full-page')).toBe('full-page')
    expect(coerceOpenIn('page-preview')).toBe('page-preview')
    expect(coerceOpenIn('nonsense')).toBeUndefined()
    expect(coerceOpenIn(undefined)).toBeUndefined()
  })
})

describe('view_button coercion', () => {
  it('accepts valid values, drops junk', () => {
    expect(coerceViewButton('labeled')).toBe('labeled')
    expect(coerceViewButton('nope')).toBeUndefined()
  })
})

describe('container sidecar round-trip', () => {
  it('collection keeps open_in + view_button + foreign keys', () => {
    const c = pageCollectionSidecar.parse({
      id: 'c1',
      open_in: 'full-page',
      view_button: 'labeled',
      foreign: 'kept',
    })
    expect(c.open_in).toBe('full-page')
    expect(c.view_button).toBe('labeled')
    expect((c as Record<string, unknown>).foreign).toBe('kept')
  })
  it('set keeps view_button (no open_in field)', () => {
    const s = pageSetSidecar.parse({
      id: 's1',
      view_button: 'icon',
    })
    expect(s.view_button).toBe('icon')
    expect('open_in' in s).toBe(false)
  })
})
