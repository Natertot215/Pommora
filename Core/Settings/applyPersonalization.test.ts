// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS } from './personalization'
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

describe('a cleared color leaves its var to the theme', () => {
  it.each([
    ['accent', '--accent'],
    ['connectionColor', '--connection'],
    ['externalLinkColor', '--link'],
    ['codeColor', '--code'],
    ['htmlTagColor', '--html-tag'],
  ] as const)('%s writes a pick and removes %s when cleared', (key, name) => {
    const inline = (): string => document.documentElement.style.getPropertyValue(name)
    applyPersonalizationKey(key, 'red')
    expect(inline()).not.toBe('')
    applyPersonalizationKey(key, undefined)
    expect(inline()).toBe('')
    applyPersonalizationKey(key, 'red')
    applyPersonalizationKey(key, SETTING_DEFAULTS[key])
    expect(inline()).toBe('')
  })
})
