import { describe, expect, it } from 'vitest'
import vectors from '../Contract/vectors.json'
import { deriveWrappingKey, fromBase64url, toBase64url } from './kdf'
import { decryptItem, encryptItem } from './item'
import {
  exportRaw,
  mintKey,
  newest,
  type RawKey,
  type Ring,
  unwrapForDevice,
  unwrapWithPassword,
  wrapForDevice,
  wrapForPassword,
} from './ring'

const KDF = { hash: 'SHA-256', iterations: 1000, salt: 'c2FsdHlzYWx0eXNhbHR5' } as const

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

const bytesOf = (hexText: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array((hexText.match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16)))

async function devicePair(): Promise<{
  x25519: string
  agree: (peerPublicKey: string) => Promise<Uint8Array>
}> {
  const pair = await globalThis.crypto.subtle.generateKey('X25519', false, ['deriveBits'])
  if (!('privateKey' in pair)) throw new Error('X25519 generated no key pair.')
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  return {
    x25519: toBase64url(new Uint8Array(raw)),
    agree: async (peerPublicKey: string) => {
      const peer = await globalThis.crypto.subtle.importKey(
        'raw',
        fromBase64url(peerPublicKey),
        'X25519',
        false,
        [],
      )
      return new Uint8Array(
        await globalThis.crypto.subtle.deriveBits(
          { name: 'X25519', public: peer },
          pair.privateKey,
          256,
        ),
      )
    },
  }
}

const older = (): RawKey => ({ ...mintKey(), createdMs: 1_000 })
const later = (): RawKey => ({ ...mintKey(), createdMs: 2_000 })

async function vectorRing(): Promise<Ring> {
  return {
    keys: [
      {
        keyId: vectors.item.keyId,
        key: await globalThis.crypto.subtle.importKey(
          'raw',
          bytesOf(vectors.item.keyHex),
          'AES-GCM',
          true,
          ['encrypt', 'decrypt'],
        ),
        createdMs: 0,
      },
    ],
  }
}

describe('the ring', () => {
  it('round-trips a ring through the password', async () => {
    const kek = await deriveWrappingKey('open sesame', KDF)
    const raw = mintKey()
    const ring = await unwrapWithPassword(await wrapForPassword([raw], kek), kek)
    expect((await exportRaw(ring))[0].raw).toEqual(raw.raw)
  })

  it('round-trips a ring through a device wrap', async () => {
    const target = await devicePair()
    const raw = mintKey()
    const entries = await wrapForDevice([raw], { deviceId: 'fe1c', x25519: target.x25519 })
    expect(entries[0].holder).toBe('fe1c')
    const ring = await unwrapForDevice(entries, 'fe1c', target.agree)
    expect((await exportRaw(ring))[0].raw).toEqual(raw.raw)
  })

  it('unwraps a two-entry ring and names the later key newest', async () => {
    const kek = await deriveWrappingKey('open sesame', KDF)
    const [first, second] = [older(), later()]
    const ring = await unwrapWithPassword(await wrapForPassword([first, second], kek), kek)
    expect(ring.keys).toHaveLength(2)
    expect(newest(ring).keyId).toBe(second.keyId)
  })

  it('rejects a wrong password as wrong-password', async () => {
    const entries = await wrapForPassword([mintKey()], await deriveWrappingKey('right', KDF))
    await expect(
      unwrapWithPassword(entries, await deriveWrappingKey('wrong', KDF)),
    ).rejects.toThrow('wrong-password')
  })
})

describe('an item blob', () => {
  it('reproduces the shared item vector', async () => {
    const ring = await vectorRing()
    const blob = await encryptItem(
      ring.keys[0],
      vectors.item.path,
      new TextEncoder().encode(vectors.item.plaintext),
      bytesOf(vectors.item.ivHex),
    )
    expect(hex(blob)).toBe(vectors.item.blobHex)
  })

  it('reads back what it wrote', async () => {
    const ring = await vectorRing()
    const plaintext = await decryptItem(
      ring,
      vectors.item.keyId,
      vectors.item.path,
      bytesOf(vectors.item.blobHex),
    )
    expect(new TextDecoder().decode(plaintext)).toBe(vectors.item.plaintext)
  })

  it('rejects a blob whose path was moved', async () => {
    const ring = await vectorRing()
    await expect(
      decryptItem(ring, vectors.item.keyId, 'Notes/Moved.md', bytesOf(vectors.item.blobHex)),
    ).rejects.toThrow()
  })

  it('rejects an unknown key id and an unknown version byte', async () => {
    const ring = await vectorRing()
    const blob = bytesOf(vectors.item.blobHex)
    await expect(decryptItem(ring, 'nope', vectors.item.path, blob)).rejects.toThrow('unknown-key')
    const stamped = new Uint8Array(blob)
    stamped[0] = 0x02
    await expect(decryptItem(ring, vectors.item.keyId, vectors.item.path, stamped)).rejects.toThrow(
      'unsupported-item-version',
    )
  })
})
