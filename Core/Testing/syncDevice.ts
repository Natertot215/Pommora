import type { HostContext, HostDevice } from '../Contract/handlers'
import type { KdfParams } from '../Sync/Contract/wire'
import { fromBase64url, toBase64url } from '../Sync/Keys/ring'

export const TEST_KDF = {
  hash: 'SHA-256',
  iterations: 1_000,
  salt: 'c2FsdA',
} as const satisfies KdfParams

export const TEST_PUBLIC_KEY = 'k'.repeat(43)

export interface TestSecrets {
  map: Map<string, string>
  get(name: string): Promise<string | null>
  set(name: string, value: string | null): Promise<void>
}

export function memorySecrets(): TestSecrets {
  const map = new Map<string, string>()
  return {
    map,
    get: async (name) => map.get(name) ?? null,
    set: async (name, value) => {
      if (value === null) map.delete(name)
      else map.set(name, value)
    },
  }
}

export interface TestAgreement {
  x25519: string
  agree(peerPublicKey: string): Promise<Uint8Array>
}

export async function agreementPair(): Promise<TestAgreement> {
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

export async function testDevice(
  id: string,
  name: string,
  onRename: (next: string) => void = () => {},
): Promise<HostDevice> {
  const agreement = await agreementPair()
  const device: HostDevice = {
    id,
    publicKey: TEST_PUBLIC_KEY,
    name,
    x25519: agreement.x25519,
    sign: async () => 'sig',
    agree: agreement.agree,
    rename: async (next) => {
      onRename(next)
      device.name = next
    },
  }
  return device
}

export const testHostSecrets = (secrets: TestSecrets): HostContext['secrets'] => secrets
