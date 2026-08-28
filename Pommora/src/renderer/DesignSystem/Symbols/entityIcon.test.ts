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

  // The two gates disagree on purpose, and the same name shows it: an override must be CURATED,
  // where an entity's own icon may be any Lucide id. `readNexus` keeps whatever was stored
  // (`readNexus.test.ts` holds that half), so the rejection can only happen here.
  it('one uncurated-but-real glyph: rejected as an override, kept as an own icon', () => {
    expect(entityIcon('context', undefined, { context: 'anchor' })).toBe(
      DEFAULT_ENTITY_ICONS.context,
    )
    expect(entityIcon('context', 'anchor', { context: 'anchor' })).toBe('anchor')
  })

  it('a Context and a Space no longer share a mark, and neither default moves the other', () => {
    expect(DEFAULT_ENTITY_ICONS.context).not.toBe(DEFAULT_ENTITY_ICONS.space)
    expect(entityIcon('context', undefined, { space: 'server' })).toBe(DEFAULT_ENTITY_ICONS.context)
    expect(entityIcon('space', undefined, { context: 'server' })).toBe(DEFAULT_ENTITY_ICONS.space)
  })
})
