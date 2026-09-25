// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyPersonalizationKey } from './applyPersonalization'

describe('the Embed Scale setting reaches the root', () => {
  const embedScale = (): string => document.documentElement.style.getPropertyValue('--embed-scale')

  it('writes the stored scale', () => {
    applyPersonalizationKey('embedScale', 1.2)
    expect(embedScale()).toBe('1.2')
  })
  it('writes the fallback for a cleared value', () => {
    applyPersonalizationKey('embedScale', undefined)
    expect(embedScale()).toBe('0.9')
  })
})
