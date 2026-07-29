import { describe, expect, it } from 'vitest'
import { parseDocument } from 'yaml'
import {
  invalidPropertyName,
  isGovernedKey,
  normalizePropertyName,
  parseGovernedKey,
  wrapKey,
} from './governedKeys'

describe('governedKeys', () => {
  it('wraps each layer in its own sigil', () => {
    expect(wrapKey('context', 'Projects')).toBe('(Projects)')
    expect(wrapKey('property', 'Status')).toBe('<Status>')
  })

  it('round-trips a name containing the closing glyph', () => {
    expect(parseGovernedKey(wrapKey('property', 'Budget (USD)'))).toEqual({
      layer: 'property',
      name: 'Budget (USD)',
    })
  })

  it('rejects unwrapped, mismatched and empty keys', () => {
    for (const k of ['Projects', '(Projects>', '<>', '()', '', 'id'])
      expect(parseGovernedKey(k)).toBeNull()
  })

  it('governs any wrapped key, malformed included, so a rewrite still sweeps it', () => {
    expect(isGovernedKey('(Anything')).toBe(true)
    expect(isGovernedKey('<Anything')).toBe(true)
    expect(isGovernedKey('id')).toBe(false)
  })

  it('scopes governance to one layer on request', () => {
    expect(isGovernedKey('(Projects)', 'context')).toBe(true)
    expect(isGovernedKey('<Projects>', 'context')).toBe(false)
    expect(isGovernedKey('<Status>', 'property')).toBe(true)
    expect(isGovernedKey('(Status)', 'property')).toBe(false)
  })

  it('parses the layer, so a same-named Context and property never collide', () => {
    expect(parseGovernedKey('(Projects)')?.layer).toBe('context')
    expect(parseGovernedKey('<Projects>')?.layer).toBe('property')
  })

  it('normalizes once — trim then NFC', () => {
    // Decomposed input (e + combining acute), precomposed expectation. Two literals typed the
    // same way assert nothing — an implementation with no .normalize() call would pass.
    expect(normalizePropertyName('  Cafe\u0301  ')).toBe('Caf\u00e9')
  })

  it('refuses a leading $ and an empty name, allows an interior $', () => {
    expect(invalidPropertyName('$Status')).toBe(true)
    expect(invalidPropertyName('   ')).toBe(true)
    expect(invalidPropertyName('Budget ($)')).toBe(false)
  })

  // The reason these glyphs were chosen, pinned against a `yaml` upgrade. Keys derive from
  // wrapKey, so a SIGIL swap retargets this test automatically instead of silently passing.
  it('a wrapped key round-trips through the serializer', () => {
    for (const key of [
      wrapKey('context', 'Projects'),
      wrapKey('property', 'Status'),
      wrapKey('property', 'Budget ($)'),
    ]) {
      // Round-tripped through the emitter rather than a hand-written literal, so the assertion
      // follows a SIGIL swap instead of silently passing against the old glyphs.
      const written = parseDocument('id: P\n')
      written.set(key, 'Complete')
      const doc = parseDocument(written.toString({ lineWidth: 0 }))
      expect(doc.errors).toHaveLength(0)
      expect(Object.keys(doc.toJSON())).toContain(key)
    }
  })
})
