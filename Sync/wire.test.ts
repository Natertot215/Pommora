import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blobPath, canonical, fingerprintOf, sha256Hex } from './wire.ts'

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../Core/Sync/Contract/vectors.json', import.meta.url)),
    'utf8',
  ),
) as {
  canonical: {
    method: string
    path: string
    body: string
    timestampMs: number
    canonical: string
  }[]
  fingerprint: { publicKey: string; id: string }
  blobPath: { nexusId: string; sha256: string; path: string }
}

describe('the hub wire', () => {
  it('matches the shared canonical vectors', () => {
    for (const vector of fixture.canonical) {
      expect(
        canonical(
          vector.method,
          vector.path,
          sha256Hex(Buffer.from(vector.body, 'utf8')),
          vector.timestampMs,
        ),
      ).toBe(vector.canonical)
    }
  })

  it('matches the shared device-id vector', () => {
    expect(fingerprintOf(fixture.fingerprint.publicKey)).toBe(fixture.fingerprint.id)
  })

  it('matches the shared blob-path vector', () => {
    expect(blobPath(fixture.blobPath.nexusId, fixture.blobPath.sha256)).toBe(fixture.blobPath.path)
  })
})
