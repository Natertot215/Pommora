import { describe, it, expect } from 'vitest'
import { ALL_ICONS, iconMarkup, lucideGlyph, searchIcons, toKebabIconId } from './allSymbols'
import { ICON_NAMES } from './iconNames'
import { ICON_TAGS } from './iconTags'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { asRenderableIcon, Icon, icons, loadFullIconSet } from './index'

describe('toKebabIconId', () => {
  it('matches lucide canonical kebab for the tricky boundary cases', () => {
    expect(toKebabIconId('ClockPlus')).toBe('clock-plus')
    expect(toKebabIconId('ArrowUpDown')).toBe('arrow-up-down')
    expect(toKebabIconId('Columns3Cog')).toBe('columns-3-cog')
    expect(toKebabIconId('Grid3x3')).toBe('grid-3-x-3')
    expect(toKebabIconId('AArrowDown')).toBe('a-arrow-down')
    expect(toKebabIconId('ALargeSmall')).toBe('a-large-small')
  })

  it('gives every curated key that is also a Lucide id that same Lucide glyph', () => {
    for (const [id, Glyph] of Object.entries(icons)) {
      const displayName = (Glyph as { displayName?: string }).displayName
      expect(!ICON_NAMES.has(id) || toKebabIconId(displayName ?? '') === id, id).toBe(true)
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

describe('iconMarkup', () => {
  it('draws an app glyph and an aliased name as themselves, as standalone SVG in the color asked', () => {
    const mark = iconMarkup('pommora', '#123456')
    const alias = iconMarkup('view-table', '#123456')
    expect(mark).toContain('<circle')
    expect(alias).toContain('lucide-grid-3x2')
    for (const svg of [mark, alias]) {
      expect(svg).not.toContain('square-dashed')
      expect(svg).toMatch(/^<svg[^>]* xmlns="http:\/\/www.w3.org\/2000\/svg"/)
      expect(svg).toContain('color:#123456')
    }
  })

  it('draws a glyph from the full set once the set has loaded', async () => {
    await loadFullIconSet()
    expect(iconMarkup('earth', '#123456')).toContain('lucide-earth')
  })
})

describe('ICON_NAMES', () => {
  it('matches the resolvable set exactly, so eager validation agrees with lazy resolution', () => {
    expect(
      [...ICON_NAMES].sort((a, b) => a.localeCompare(b)),
      'ICON_NAMES is stale — run `npm run icons:names`',
    ).toEqual(ALL_ICONS.map((e) => e.id))
  })
})

describe('asRenderableIcon', () => {
  it('accepts curated and full-roster ids, and no name Object.prototype carries', () => {
    expect(asRenderableIcon('pommora')).toBe('pommora')
    expect(asRenderableIcon('anchor')).toBe('anchor')
    for (const name of ['constructor', '__proto__', 'valueOf', 'hasOwnProperty'])
      expect(asRenderableIcon(name)).toBeUndefined()
  })

  it('draws a name Object.prototype carries as the placeholder rather than throwing', () => {
    for (const name of ['constructor', '__proto__', 'valueOf', 'hasOwnProperty'])
      expect(renderToStaticMarkup(createElement(Icon, { name }))).toContain('<svg')
  })
})

describe('ICON_TAGS', () => {
  const require = createRequire(import.meta.url)
  const lucideTags: Record<string, string[]> = require('lucide-static/tags.json')
  const dashless = (id: string): string => id.replace(/-/g, '')

  it('keys exactly the resolvable set, in roster order', () => {
    expect(Object.keys(ICON_TAGS), 'ICON_TAGS is stale — run `npm run icons:names`').toEqual(
      ALL_ICONS.map((e) => e.id),
    )
  })

  it('carries lucide-static tags for every icon, joining the ids lucide-react splits differently', () => {
    const byDashless = new Map(Object.entries(lucideTags).map(([n, t]) => [dashless(n), t]))
    for (const { id } of ALL_ICONS) expect(ICON_TAGS[id], id).toEqual(byDashless.get(dashless(id)))
    expect(ICON_TAGS['axis-3-d']).toEqual(lucideTags['axis-3d'])
    expect(ICON_TAGS['arrow-down-01']).toEqual(lucideTags['arrow-down-0-1'])
  })

  it('generates from a roster that loads under plain Node, as the generator runs it', () => {
    const roster = fileURLToPath(new URL('./iconRoster.ts', import.meta.url))
    const count = execFileSync(process.execPath, [
      '--input-type=module',
      '-e',
      `const { ALL_ICONS } = await import(${JSON.stringify(roster)}); process.stdout.write(String(ALL_ICONS.length))`,
    ])
    expect(Number(count)).toBe(ALL_ICONS.length)
  })

  it('comes from the same Lucide release as the glyphs', () => {
    expect(require('lucide-static/package.json').version).toBe(
      require('lucide-react/package.json').version,
    )
  })
})

describe('searchIcons', () => {
  const ids = (query: string): string[] => searchIcons(query).map((e) => e.id)

  it('returns everything for an empty query', () => {
    expect(searchIcons('  ')).toBe(ALL_ICONS)
  })

  it('is case-, dash-, and space-insensitive across names and tags', () => {
    expect(ids('arrow up')).toContain('arrow-up-down')
    expect(ids('arrow up')).toEqual(ids('arrowup'))
    expect(ids('arrow up')).toEqual(ids('ARROW-UP'))
    expect(ids('font size')).toEqual([
      'a-arrow-down',
      'a-arrow-up',
      'a-large-small',
      'text-initial',
    ])
    expect(ids('font size')).toEqual(ids('Font-Size'))
  })

  it('finds an icon by its Lucide tags', () => {
    expect(ids('loop')).toEqual(['infinity', 'repeat', 'repeat-2', 'repeat-off'])
    expect(ids('gizmo')).toEqual(['axis-3-d', 'move-3-d', 'rotate-3-d', 'scale-3-d'])
    expect(ids('€')).toEqual(['badge-euro', 'receipt-euro'])
  })

  it('ranks the exact name, then name prefixes, then name substrings, then exact tags', () => {
    expect(ids('repeat')).toEqual(['repeat', 'repeat-1', 'repeat-2', 'repeat-off', 'calendar-sync'])
    expect(ids('car').slice(0, 8)).toEqual([
      'car',
      'car-front',
      'car-taxi-front',
      'caravan',
      'card-sim',
      'carrot',
      'cable-car',
      'credit-card',
    ])
  })

  it('places a tag-word prefix after every other kind of match', () => {
    const home = ids('home')
    expect(home.slice(0, 5)).toEqual(['birdhouse', 'blinds', 'dock', 'house', 'house-plug'])
    expect(home.indexOf('book')).toBeGreaterThan(home.indexOf('newspaper'))
    expect(home).toContain('caravan')
    const car = ids('car')
    expect(car.indexOf('activity')).toBeGreaterThan(car.indexOf('wallet-cards'))
    expect(ids('font si')).toEqual(ids('font size'))
  })

  it('matches a tag from the start of one of its words, never from inside one', () => {
    expect(ids('intensive')).toContain('activity')
    expect(ids('ntensive')).toEqual([])
    expect(ids('looparrows')).toEqual([])
  })

  it('returns nothing for a query no name or tag holds', () => {
    expect(searchIcons('zzqqxx')).toEqual([])
  })
})
