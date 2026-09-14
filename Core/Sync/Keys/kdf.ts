import type { KdfParams } from '../Contract/wire'
import { fromBase64url, toBase64url, utf8 } from './ring'

const ITERATIONS = 600_000

export function freshKdfParams(): KdfParams {
  return {
    hash: 'SHA-256',
    iterations: ITERATIONS,
    salt: toBase64url(globalThis.crypto.getRandomValues(new Uint8Array(16))),
  }
}

export async function deriveWrappingKey(password: string, params: KdfParams): Promise<CryptoKey> {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    utf8(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: params.hash,
      salt: fromBase64url(params.salt),
      iterations: params.iterations,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
