import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { canonical, sha256Hex } from './wire.ts'

describe('the hub wire', () => {
  it('matches the shared canonical vectors', () => {
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
    }
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
})
