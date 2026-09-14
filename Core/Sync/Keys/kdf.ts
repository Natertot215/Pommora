import type { KdfParams } from '../Contract/wire'

const ITERATIONS = 600_000

export type Bytes = Uint8Array<ArrayBuffer>

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
    new TextEncoder().encode(password.normalize('NFKC')),
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
