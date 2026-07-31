import { describe, it, expect } from 'vitest'
import { contentId, PAGE_ID_KEY } from './identity'

describe('contentId', () => {
  it('reads the id off a parsed frontmatter root', () => {
    expect(contentId({ [PAGE_ID_KEY]: 'X' })).toBe('X')
  })

  it('is undefined when the key is absent — the adoptable case, not an error', () => {
    expect(contentId({})).toBeUndefined()
    expect(contentId({ icon: 'star' })).toBeUndefined()
  })

  it('is undefined for a non-string value — YAML admits numbers, maps and lists', () => {
    expect(contentId({ [PAGE_ID_KEY]: 3 })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: null })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: { nested: true } })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: ['a'] })).toBeUndefined()
  })

  it('is undefined for an empty string — a present key with no value is not an identity', () => {
    expect(contentId({ [PAGE_ID_KEY]: '' })).toBeUndefined()
  })
})
