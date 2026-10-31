import { describe, expect, it } from 'vitest'
import { DEFAULT_KEY_FORMAT, formatKey, keyFormat } from './keyFormat'

const unchangedBy = (word: string) => keyFormat.options.filter((f) => formatKey(word, f) === word)

describe('keyFormat', () => {
  it('lists the ten formats with Match Title first and as the default', () => {
    expect(keyFormat.options).toEqual([
      'Match Title',
      'lowercase',
      'UPPERCASE',
      'kebab-case',
      'PascalCase',
      'camelCase',
      'snake_case',
      'Train-Case',
      'UPPER_SNAKE_CASE',
      'UPPER-KEBAB-CASE',
    ])
    expect(DEFAULT_KEY_FORMAT).toBe('Match Title')
  })

  it('writes the label as it is without a format', () => {
    expect(formatKey('Due Date')).toBe('Due Date')
  })

  it('keeps punctuation inside its word and lowercase keeps separators', () => {
    expect(formatKey('v5.0', 'kebab-case')).toBe('v5.0')
    expect(formatKey('J. Crew', 'kebab-case')).toBe('j.-crew')
    expect(formatKey('New Property', 'lowercase')).toBe('new property')
    expect(formatKey('Due-Date', 'lowercase')).toBe('due-date')
  })

  it('splits at humps and converts its own output to itself', () => {
    expect(formatKey('IPhone', 'kebab-case')).toBe('i-phone')
    expect(formatKey('XMLHttp', 'kebab-case')).toBe('xml-http')
    expect(formatKey('iPhone 17', 'PascalCase')).toBe('IPhone17')
    expect(formatKey('IPhone17', 'PascalCase')).toBe('IPhone17')
    expect(formatKey('A B Test', 'camelCase')).toBe('aBTest')
    expect(formatKey('aBTest', 'camelCase')).toBe('aBTest')
  })

  it('cases each word of URL Slug per convention', () => {
    expect(formatKey('URL Slug', 'PascalCase')).toBe('UrlSlug')
    expect(formatKey('URL Slug', 'camelCase')).toBe('urlSlug')
    expect(formatKey('URL Slug', 'Train-Case')).toBe('Url-Slug')
    expect(formatKey('URL Slug', 'snake_case')).toBe('url_slug')
    expect(formatKey('URL Slug', 'UPPER_SNAKE_CASE')).toBe('URL_SLUG')
    expect(formatKey('URL Slug', 'UPPER-KEBAB-CASE')).toBe('URL-SLUG')
  })

  it('leaves Red, RED, and green unchanged under exactly the formats that could produce them', () => {
    expect(unchangedBy('Red')).toEqual(['Match Title', 'PascalCase', 'Train-Case'])
    expect(unchangedBy('RED')).toEqual([
      'Match Title',
      'UPPERCASE',
      'UPPER_SNAKE_CASE',
      'UPPER-KEBAB-CASE',
    ])
    expect(unchangedBy('green')).toEqual([
      'Match Title',
      'lowercase',
      'kebab-case',
      'camelCase',
      'snake_case',
    ])
  })

  it('writes a snake_case key from a spaced label', () => {
    expect(formatKey('Heading Icon Hidden', 'snake_case')).toBe('heading_icon_hidden')
  })

  it('cases ß, ligatures, final sigma, and NFD labels correctly', () => {
    expect(formatKey('Straße', 'UPPERCASE')).toBe('STRASSE')
    expect(formatKey('Straße', 'lowercase')).toBe('straße')
    expect(formatKey('ﬁle Name', 'Train-Case')).toBe('File-Name')
    expect(formatKey('File-Name', 'Train-Case')).toBe('File-Name')
    expect(formatKey('ΑΣ Σ', 'PascalCase')).toBe('ΑςΣ')
    expect(formatKey('CaféBar'.normalize('NFD'), 'kebab-case')).toBe('café-bar')
    expect(formatKey('CaféBar'.normalize('NFD'), 'kebab-case')).toBe(
      formatKey('CaféBar'.normalize('NFC'), 'kebab-case'),
    )
  })

  it('round-trips J. Crew under PascalCase to a different key', () => {
    expect(formatKey('J. Crew', 'PascalCase')).toBe('J.Crew')
    expect(formatKey('J.Crew', 'PascalCase')).toBe('J.crew')
  })

  it('drops an all-separator label to empty only where separators are dropped', () => {
    expect(formatKey('---', 'kebab-case')).toBe('')
    expect(formatKey('---', 'lowercase')).toBe('---')
  })
})
