import { describe, expect, it } from 'vitest'
import {
  createSpaceLabel,
  contextKey,
  contextsRegistry,
  normalizeContextValue,
  parseContextKey,
  seededRegistry,
} from './contexts'

describe('contextKey / parseContextKey', () => {
  it('wraps a title in its layer sigil', () => {
    expect(contextKey('Projects')).toBe('<Projects>')
  })

  it('round-trips through parseContextKey', () => {
    expect(parseContextKey(contextKey('Projects'))).toBe('Projects')
  })

  it('round-trips a title carrying the closing glyph — the strip is positional', () => {
    expect(parseContextKey(contextKey('Q3 <Draft>'))).toBe('Q3 <Draft>')
  })

  it('rejects unwrapped and empty keys', () => {
    expect(parseContextKey('Projects')).toBeNull()
    expect(parseContextKey('')).toBeNull()
    expect(parseContextKey('()')).toBeNull()
  })

  it('refuses an unwrapped or empty key, so a same-named Context and property never collide', () => {
    expect(parseContextKey('Projects')).toBeNull()
    expect(parseContextKey('(Projects)')).toBeNull()
    expect(parseContextKey('<>')).toBeNull()
  })
})

describe('normalizeContextValue', () => {
  it('string-coerces YAML scalars', () => {
    expect(normalizeContextValue(2024)).toBe('2024')
    expect(normalizeContextValue(true)).toBe('true')
  })

  it('trims, lowercases, and NFC-normalizes', () => {
    const nfd = 'Café'
    expect(normalizeContextValue(nfd)).toBe('café')
    expect(normalizeContextValue('  Pommora ')).toBe('pommora')
  })
})

describe('seededRegistry', () => {
  const mint = (): (() => string) => {
    let n = 0
    return () => `id-${++n}`
  }

  it('yields the three seeded contexts in order, each with a minted id', () => {
    const reg = seededRegistry(mint())
    expect(reg.contexts.map((c) => c.id)).toEqual(['id-1', 'id-2', 'id-3'])
    expect(reg.contexts.map((c) => c.title)).toEqual(['Areas', 'Topics', 'Projects'])
    expect(reg.contexts.map((c) => c.singular)).toEqual(['Area', 'Topic', 'Project'])
  })
})

describe('createSpaceLabel', () => {
  it('speaks a seeded Context’s singular, and falls back for one without', () => {
    expect(createSpaceLabel({ id: 'a', title: 'Areas', singular: 'Area' })).toBe('New Area')
    expect(createSpaceLabel({ id: 'b', title: 'Clients', singular: '' })).toBe('New Space')
  })
})

describe('contextsRegistry schema', () => {
  it('parses and preserves unknown fields', () => {
    const raw = {
      contexts: [{ id: 'ctx_areas', title: 'Areas', singular: 'Area', future_field: 7 }],
      foreign: true,
    }
    const parsed = contextsRegistry.parse(raw)
    expect((parsed as Record<string, unknown>).foreign).toBe(true)
    expect((parsed.contexts[0] as Record<string, unknown>).future_field).toBe(7)
  })

  it('rejects an entry missing its id', () => {
    expect(() => contextsRegistry.parse({ contexts: [{ title: 'X', singular: 'X' }] })).toThrow()
  })
})
