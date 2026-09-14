import { describe, expect, it } from 'vitest'
import { blobPath, ROUTES, canonicalString } from './canonical'
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

describe('blobPath', () => {
  it('matches the pinned vector', () => {
    expect(blobPath(vectors.blobPath.nexusId, vectors.blobPath.sha256)).toBe(vectors.blobPath.path)
  })
})
