import { type Bytes, open, type Ring, type RingKey, seal, utf8 } from './ring'

const VERSION = 0x01
const STAMP = new Uint8Array([VERSION])

const itemAad = (keyId: string, path: string): Bytes =>
  utf8(`pommora-item/1\n${keyId}\n${path.normalize('NFC')}`)

export async function encryptItem(
  key: RingKey,
  path: string,
  plaintext: Bytes,
  iv: Bytes = globalThis.crypto.getRandomValues(new Uint8Array(12)),
): Promise<Bytes> {
  return seal(key.key, plaintext, itemAad(key.keyId, path), STAMP, iv)
}

export async function decryptItem(
  ring: Ring,
  keyId: string,
  path: string,
  blob: Bytes,
): Promise<Bytes> {
  if (blob[0] !== VERSION) throw new Error('unsupported-item-version')
  const key = ring.keys.find((candidate) => candidate.keyId === keyId)
  if (key === undefined) throw new Error('unknown-key')
  return open(key.key, blob.subarray(1), itemAad(keyId, path))
}
