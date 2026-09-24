import { describe, it, expect } from 'vitest'
import { entityIcon, DEFAULT_ENTITY_ICONS } from './entityIconPolicy'

describe('entityIcon — the one glyph resolution', () => {
  it('the user-assigned icon wins when renderable', () => {
    expect(entityIcon('page', 'star', { page: 'server' })).toBe('star')
  })

  it('falls to the nexus override when the entity has none', () => {
    expect(entityIcon('page', undefined, { page: 'server' })).toBe('server')
  })

  it('falls to the seed when there is no override', () => {
    expect(entityIcon('page', undefined, undefined)).toBe(DEFAULT_ENTITY_ICONS.page)
    expect(entityIcon('set', undefined, {})).toBe(DEFAULT_ENTITY_ICONS.set)
  })

  it('an unrenderable own icon falls to the override, an unrenderable override to the seed', () => {
    expect(entityIcon('space', 'not-a-real-glyph-id', { space: 'server' })).toBe('server')
    expect(entityIcon('space', undefined, { space: 'not-a-real-glyph-id' })).toBe(
      DEFAULT_ENTITY_ICONS.space,
    )
  })

  it('an uncurated-but-real glyph renders as an override and as an own icon alike', () => {
    expect(entityIcon('context', undefined, { context: 'anchor' })).toBe('anchor')
    expect(entityIcon('context', 'anchor', undefined)).toBe('anchor')
  })

  it('a name Object.prototype carries is not an icon', () => {
    expect(entityIcon('page', 'constructor', { page: '__proto__' })).toBe(DEFAULT_ENTITY_ICONS.page)
  })

  it('a Context and a Space no longer share a mark, and neither default moves the other', () => {
    expect(DEFAULT_ENTITY_ICONS.context).not.toBe(DEFAULT_ENTITY_ICONS.space)
    expect(entityIcon('context', undefined, { space: 'server' })).toBe(DEFAULT_ENTITY_ICONS.context)
    expect(entityIcon('space', undefined, { context: 'server' })).toBe(DEFAULT_ENTITY_ICONS.space)
  })
})
