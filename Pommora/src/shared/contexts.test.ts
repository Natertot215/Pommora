import { describe, expect, it } from 'vitest'
import {
  createSpaceLabel,
  contextKey,
  contextsRegistry,
  invalidContextTitle,
  normalizeContextValue,
  parseContextKey,
  seededRegistry,
} from './contexts'
import { DEFAULT_LABELS } from './types'

describe('contextKey / parseContextKey', () => {
  it('wraps a title in brackets', () => {
    expect(contextKey('Projects')).toBe('[Projects]')
  })

  it('round-trips through parseContextKey', () => {
    expect(parseContextKey(contextKey('Projects'))).toBe('Projects')
  })

  it('rejects non-bracketed and malformed keys', () => {
    expect(parseContextKey('Projects')).toBeNull()
    expect(parseContextKey('[Pro]ject]')).toBeNull()
    expect(parseContextKey('')).toBeNull()
    expect(parseContextKey('[]')).toBeNull()
  })
})

describe('invalidContextTitle', () => {
  it('rejects brackets, separators, and empties', () => {
    expect(invalidContextTitle('Pro[ject')).toBe(true)
    expect(invalidContextTitle('Pro]ject')).toBe(true)
    expect(invalidContextTitle('a/b')).toBe(true)
    expect(invalidContextTitle('')).toBe(true)
    expect(invalidContextTitle('  ')).toBe(true)
  })

  it('accepts ordinary titles', () => {
    expect(invalidContextTitle('Projects')).toBe(false)
    expect(invalidContextTitle('Side Projects')).toBe(false)
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

  it('yields the three seeded contexts in label order, each with a minted id', () => {
    const reg = seededRegistry(DEFAULT_LABELS, mint())
    expect(reg.contexts.map((c) => c.id)).toEqual(['id-1', 'id-2', 'id-3'])
    expect(reg.contexts.map((c) => c.title)).toEqual(['Areas', 'Topics', 'Projects'])
    expect(reg.contexts.map((c) => c.singular)).toEqual(['Area', 'Topic', 'Project'])
  })

  it('disambiguates colliding custom plurals — titles are nexus-wide identity', () => {
    const reg = seededRegistry(
      { ...DEFAULT_LABELS, topic: { singular: 'Area', plural: 'Areas' } },
      mint(),
    )
    expect(reg.contexts.map((c) => c.title)).toEqual(['Areas', 'Areas 2', 'Projects'])
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
