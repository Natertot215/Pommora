import { describe, expect, it } from 'vitest'
import { ROUTES, canonicalString } from './authority'
import vectors from './vectors.json'

describe('canonicalString', () => {
  for (const vector of vectors.canonical) {
    it(`matches the pinned vector for ${vector.path}`, () => {
      expect(
        canonicalString(vector.method, vector.path, vector.bodySha256, vector.timestampMs),
      ).toBe(vector.canonical)
    })
  }
})

describe('ROUTES', () => {
  it('carries the connect path', () => {
    expect(ROUTES.connect.path).toBe('/connect')
  })
})
