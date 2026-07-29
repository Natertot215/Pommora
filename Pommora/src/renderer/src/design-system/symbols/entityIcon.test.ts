import { describe, it, expect } from 'vitest'
import { entityIcon, DEFAULT_ENTITY_ICONS } from './index'

describe('entityIcon — the one glyph resolution', () => {
  it('the user-assigned icon wins when renderable', () => {
    expect(entityIcon('page', 'star', { page: 'server' })).toBe('star')
  })

  it('falls to the nexus override when the entity has none — overrides are curated-only', () => {
    expect(entityIcon('page', undefined, { page: 'server' })).toBe('server')
  })

  it('falls to the seed when there is no override', () => {
    expect(entityIcon('page', undefined, undefined)).toBe(DEFAULT_ENTITY_ICONS.page)
    expect(entityIcon('set', undefined, {})).toBe(DEFAULT_ENTITY_ICONS.set)
  })

  it('an unrenderable own icon falls to the override, an uncurated override to the seed', () => {
    expect(entityIcon('space', 'not-a-real-glyph-id', { space: 'server' })).toBe('server')
    expect(entityIcon('space', undefined, { space: 'not-a-real-glyph-id' })).toBe(
      DEFAULT_ENTITY_ICONS.space,
    )
  })
})
