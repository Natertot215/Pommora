import type { Bytes } from './kdf'
import { concat, open, type Ring, type RingKey, seal } from './ring'

const VERSION = 0x01

const itemAad = (keyId: string, path: string): Bytes =>
  new TextEncoder().encode(`pommora-item/1\n${keyId}\n${path.normalize('NFC')}`)

export async function encryptItem(
  k: RingKey,
  path: string,
  plaintext: Uint8Array,
  iv: Bytes = globalThis.crypto.getRandomValues(new Uint8Array(12)),
): Promise<Bytes> {
  return concat(new Uint8Array([VERSION]), await seal(k.key, plaintext, itemAad(k.keyId, path), iv))
}

export async function decryptItem(
  ring: Ring,
  keyId: string,
  path: string,
  blob: Uint8Array,
): Promise<Bytes> {
  if (blob[0] !== VERSION) throw new Error('unsupported-item-version')
  const key = ring.keys.find((candidate) => candidate.keyId === keyId)
  if (key === undefined) throw new Error('unknown-key')
  return open(key.key, new Uint8Array(blob).slice(1), itemAad(keyId, path))
}
