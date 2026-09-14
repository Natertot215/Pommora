import { ulid } from 'ulidx'
import type { RingEntry } from '../Contract/wire'

export type Bytes = Uint8Array<ArrayBuffer>

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
  raw: Bytes
  createdMs: number
}

const IV_BYTES = 12
const PUBLIC_KEY_BYTES = 32
const WRAP_INFO = 'pommora-ring-wrap/1'
const NOTHING = new Uint8Array(0)
const ENCODER = new TextEncoder()

const subtle = (): SubtleCrypto => globalThis.crypto.subtle

export const utf8 = (text: string): Bytes => ENCODER.encode(text)

export const owned = (bytes: Uint8Array): Bytes => new Uint8Array(bytes)

export function toBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64url(text: string): Bytes {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const ringAad = (keyId: string, holder: string): Bytes =>
  utf8(`pommora-ring/1\n${keyId}\n${holder}`)

function concat(...parts: Uint8Array[]): Bytes {
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
  plaintext: Bytes,
  additionalData: Bytes,
  head: Bytes = NOTHING,
  iv: Bytes = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES)),
): Promise<Bytes> {
  const sealed = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData }, key, plaintext)
  return concat(head, iv, new Uint8Array(sealed))
}

export async function open(key: CryptoKey, blob: Bytes, additionalData: Bytes): Promise<Bytes> {
  const opened = await subtle().decrypt(
    { name: 'AES-GCM', iv: blob.subarray(0, IV_BYTES), additionalData },
    key,
    blob.subarray(IV_BYTES),
  )
  return new Uint8Array(opened)
}

const importRaw = (raw: Bytes): Promise<CryptoKey> =>
  subtle().importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt'])

async function agreementKey(shared: Uint8Array): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', new Uint8Array(shared), 'HKDF', false, [
    'deriveKey',
  ])
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: NOTHING, info: utf8(WRAP_INFO) },
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
        await seal(key, raw.raw, ringAad(raw.keyId, target.deviceId), ephemeral),
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
        const shared = await agree(toBase64url(blob.subarray(0, PUBLIC_KEY_BYTES)))
        const key = await agreementKey(shared)
        return {
          keyId: entry.keyId,
          key: await importRaw(
            await open(key, blob.subarray(PUBLIC_KEY_BYTES), ringAad(entry.keyId, deviceId)),
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
