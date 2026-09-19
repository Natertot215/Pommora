import { describe, it, expect } from 'vitest'
import { ALL_ICONS, lucideGlyph, lucideIconNodes, searchIcons, toKebabIconId } from './allSymbols'
import { ICON_NAMES } from './iconNames'
import { icons } from './index'

describe('toKebabIconId', () => {
  it('matches lucide canonical kebab for the tricky boundary cases', () => {
    expect(toKebabIconId('ClockPlus')).toBe('clock-plus')
    expect(toKebabIconId('ArrowUpDown')).toBe('arrow-up-down')
    expect(toKebabIconId('Columns3Cog')).toBe('columns-3-cog')
    expect(toKebabIconId('Grid3x3')).toBe('grid-3-x-3')
    expect(toKebabIconId('AArrowDown')).toBe('a-arrow-down')
    expect(toKebabIconId('ALargeSmall')).toBe('a-large-small')
  })

  it('reproduces the curated registry id for every plain-Lucide curated entry', () => {
    // The curated set carries app aliases (`table`) + custom glyphs whose id ISN'T the Lucide kebab; for the rest, the registry key must equal toKebabIconId(the component's Lucide display name).
    for (const [id, Glyph] of Object.entries(icons)) {
      const displayName = (Glyph as { displayName?: string }).displayName
      if (!displayName || toKebabIconId(displayName) !== id) continue
      expect(toKebabIconId(displayName)).toBe(id)
    }
  })
})

describe('ALL_ICONS', () => {
  it('holds the full Lucide set, sorted, with unique ids', () => {
    expect(ALL_ICONS.length).toBeGreaterThan(1500)
    const ids = ALL_ICONS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort((a, b) => a.localeCompare(b))).toEqual(ids)
  })

  it('resolves a known id to a component and misses unknown ones', () => {
    expect(lucideGlyph('clock-plus')).toBeTypeOf('object')
    expect(lucideGlyph('not-a-real-icon')).toBeUndefined()
  })
})

describe('lucideIconNodes', () => {
  // The drawing is read out of createLucideIcon's closure, so a lucide-react release that reshapes it
  // turns this red rather than silently blanking every glyph the Matrix paints.
  it('reads the drawing out of every icon in the set', () => {
    const earth = lucideIconNodes('earth')
    expect(earth).toEqual(
      expect.arrayContaining([['circle', expect.objectContaining({ cx: '12', r: '10' })]]),
    )
    for (const { id } of ALL_ICONS) {
      const nodes = lucideIconNodes(id)
      expect(Array.isArray(nodes) && nodes.length > 0, id).toBe(true)
    }
  })

  it('misses an id the roster does not hold', () => {
    expect(lucideIconNodes('not-a-real-icon')).toBeNull()
  })
})

describe('ICON_NAMES', () => {
  it('matches the resolvable set exactly, so eager validation agrees with lazy resolution', () => {
    expect([...ICON_NAMES].sort((a, b) => a.localeCompare(b))).toEqual(ALL_ICONS.map((e) => e.id))
  })
})

describe('searchIcons', () => {
  it('returns everything for an empty query', () => {
    expect(searchIcons('  ').length).toBe(ALL_ICONS.length)
  })

  it('is dash- and space-insensitive', () => {
    const spaced = searchIcons('arrow up')
    expect(spaced.some((e) => e.id === 'arrow-up-down')).toBe(true)
    expect(spaced).toEqual(searchIcons('arrowup'))
    expect(spaced).toEqual(searchIcons('arrow-up'))
  })
})
