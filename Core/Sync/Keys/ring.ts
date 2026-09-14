import { ulid } from 'ulidx'
import type { RingEntry } from '../Contract/wire'
import { type Bytes, fromBase64url, toBase64url } from './kdf'

export interface RingKey {
  keyId: string
  key: CryptoKey
  createdMs: number
}

export interface Ring {
  keys: RingKey[]
}

export interface RawKey {
  keyId: string
  raw: Uint8Array
  createdMs: number
}

const IV_BYTES = 12
const PUBLIC_KEY_BYTES = 32
const WRAP_INFO = 'pommora-ring-wrap/1'

const subtle = (): SubtleCrypto => globalThis.crypto.subtle

const utf8 = (text: string): Bytes => new TextEncoder().encode(text)

const ringAad = (keyId: string, holder: string): Bytes =>
  utf8(`pommora-ring/1\n${keyId}\n${holder}`)

export function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

export async function seal(
  key: CryptoKey,
  plaintext: Uint8Array,
  additionalData: Bytes,
  iv: Bytes = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES)),
): Promise<Bytes> {
  const sealed = await subtle().encrypt(
    { name: 'AES-GCM', iv, additionalData },
    key,
    new Uint8Array(plaintext),
  )
  return concat(iv, new Uint8Array(sealed))
}

export async function open(key: CryptoKey, blob: Bytes, additionalData: Bytes): Promise<Bytes> {
  const opened = await subtle().decrypt(
    { name: 'AES-GCM', iv: blob.slice(0, IV_BYTES), additionalData },
    key,
    blob.slice(IV_BYTES),
  )
  return new Uint8Array(opened)
}

const importRaw = (raw: Uint8Array): Promise<CryptoKey> =>
  subtle().importKey('raw', new Uint8Array(raw), 'AES-GCM', true, ['encrypt', 'decrypt'])

async function agreementKey(shared: Uint8Array): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', new Uint8Array(shared), 'HKDF', false, [
    'deriveKey',
  ])
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(WRAP_INFO) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const newest = (ring: Ring): RingKey =>
  ring.keys.reduce((best, key) => (key.createdMs > best.createdMs ? key : best))

export const mintKey = (): RawKey => ({
  keyId: ulid(),
  raw: globalThis.crypto.getRandomValues(new Uint8Array(32)),
  createdMs: Date.now(),
})

export async function wrapForPassword(raws: RawKey[], kek: CryptoKey): Promise<RingEntry[]> {
  return Promise.all(
    raws.map(async (raw) => ({
      keyId: raw.keyId,
      holder: 'password',
      wrapped: toBase64url(await seal(kek, raw.raw, ringAad(raw.keyId, 'password'))),
      createdMs: raw.createdMs,
    })),
  )
}

export async function unwrapWithPassword(entries: RingEntry[], kek: CryptoKey): Promise<Ring> {
  try {
    return {
      keys: await Promise.all(
        entries.map(async (entry) => ({
          keyId: entry.keyId,
          key: await importRaw(
            await open(kek, fromBase64url(entry.wrapped), ringAad(entry.keyId, 'password')),
          ),
          createdMs: entry.createdMs,
        })),
      ),
    }
  } catch {
    throw new Error('wrong-password')
  }
}

export async function wrapForDevice(
  raws: RawKey[],
  target: { deviceId: string; x25519: string },
): Promise<RingEntry[]> {
  const pair = await subtle().generateKey('X25519', false, ['deriveBits'])
  if (!('privateKey' in pair)) throw new Error('X25519 generated no key pair.')
  const peer = await subtle().importKey('raw', fromBase64url(target.x25519), 'X25519', false, [])
  const shared = await subtle().deriveBits({ name: 'X25519', public: peer }, pair.privateKey, 256)
  const key = await agreementKey(new Uint8Array(shared))
  const ephemeral = new Uint8Array(await subtle().exportKey('raw', pair.publicKey))
  return Promise.all(
    raws.map(async (raw) => ({
      keyId: raw.keyId,
      holder: target.deviceId,
      wrapped: toBase64url(
        concat(ephemeral, await seal(key, raw.raw, ringAad(raw.keyId, target.deviceId))),
      ),
      createdMs: raw.createdMs,
    })),
  )
}

export async function unwrapForDevice(
  entries: RingEntry[],
  deviceId: string,
  agree: (peerPublicKey: string) => Promise<Uint8Array>,
): Promise<Ring> {
  return {
    keys: await Promise.all(
      entries.map(async (entry) => {
        const blob = fromBase64url(entry.wrapped)
        const shared = await agree(toBase64url(blob.slice(0, PUBLIC_KEY_BYTES)))
        const key = await agreementKey(shared)
        return {
          keyId: entry.keyId,
          key: await importRaw(
            await open(key, blob.slice(PUBLIC_KEY_BYTES), ringAad(entry.keyId, deviceId)),
          ),
          createdMs: entry.createdMs,
        }
      }),
    ),
  }
}

export async function exportRaw(ring: Ring): Promise<RawKey[]> {
  return Promise.all(
    ring.keys.map(async (key) => ({
      keyId: key.keyId,
      raw: new Uint8Array(await subtle().exportKey('raw', key.key)),
      createdMs: key.createdMs,
    })),
  )
}
