import { createDecipheriv } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BLOB_ROUTE, canonical, fingerprintOf, sha256Hex } from './wire.ts'

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
  item: {
    keyId: string
    keyHex: string
    path: string
    ivHex: string
    plaintext: string
    blobHex: string
  }
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
    const { nexusId, sha256, path } = fixture.blobPath
    expect(BLOB_ROUTE.exec(path)?.slice(1)).toEqual([nexusId, sha256])
  })

  it('reads the shared item vector', () => {
    const { keyId, keyHex, path, plaintext, blobHex } = fixture.item
    const blob = Buffer.from(blobHex, 'hex')
    expect(blob[0]).toBe(1)
    const iv = blob.subarray(1, 13)
    const sealed = blob.subarray(13)
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv)
    decipher.setAAD(Buffer.from(`pommora-item/1\n${keyId}\n${path}`, 'utf8'))
    decipher.setAuthTag(sealed.subarray(sealed.length - 16))
    const read = Buffer.concat([
      decipher.update(sealed.subarray(0, sealed.length - 16)),
      decipher.final(),
    ])
    expect(read.toString('utf8')).toBe(plaintext)
  })
})
