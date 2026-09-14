import { beforeEach, describe, expect, it } from 'vitest'
import type { HostContext, HostDevice } from '../../Contract/handlers'
import type { InfoRecord } from '../Contract/wire'
import { deriveWrappingKey, fromBase64url, toBase64url } from '../Keys/kdf'
import { mintKey, wrapForDevice, wrapForPassword } from '../Keys/ring'
import type { SyncHost } from './call'
import { forgetKeys, heldRing, loadRing, passwordName, ringName } from './keyring'

const KDF = { hash: 'SHA-256', iterations: 1_000, salt: 'c2FsdA' } as const
const PASSWORD = 'pw'
const DEVICE_ID = 'fe1c'

let map: Map<string, string>
let host: SyncHost

const secrets = (): HostContext['secrets'] => ({
  get: async (name) => map.get(name) ?? null,
  set: async (name, value) => {
    if (value === null) map.delete(name)
    else map.set(name, value)
  },
})

async function makeDevice(): Promise<HostDevice> {
  const pair = await globalThis.crypto.subtle.generateKey('X25519', false, ['deriveBits'])
  if (!('privateKey' in pair)) throw new Error('X25519 generated no key pair.')
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  return {
    id: DEVICE_ID,
    publicKey: 'k'.repeat(43),
    name: 'Recorder',
    x25519: toBase64url(new Uint8Array(raw)),
    sign: async () => 'sig',
    agree: async (peerPublicKey) => {
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
    rename: async () => {},
  }
}

async function keys(device: HostDevice): Promise<Pick<InfoRecord, 'ring' | 'kdf'>> {
  const key = mintKey()
  const ring = await wrapForPassword([key], await deriveWrappingKey(PASSWORD, KDF))
  ring.push(...(await wrapForDevice([key], { deviceId: device.id, x25519: String(device.x25519) })))
  return { kdf: KDF, ring }
}

beforeEach(async () => {
  map = new Map()
  host = { device: await makeDevice(), secrets: secrets() } as unknown as SyncHost
})

describe('the keyring', () => {
  it('prefers the device entry, falls back to the password, and answers null with neither', async () => {
    const info = await keys(host.device)

    expect(await loadRing(host, 'byDevice', info)).not.toBeNull()
    expect(map.has(ringName('byDevice'))).toBe(true)

    const byPassword = { ...info, ring: info.ring.filter((e) => e.holder === 'password') }
    map.set(passwordName('byPassword'), PASSWORD)
    const password = await loadRing(host, 'byPassword', byPassword)
    expect(password).not.toBeNull()
    expect(map.has(ringName('byPassword'))).toBe(false)

    expect(await loadRing(host, 'byNothing', byPassword)).toBeNull()
    expect(await loadRing(host, 'byNothing', null)).toBeNull()
  })

  it('forgets both secrets and the held ring', async () => {
    map.set(passwordName('nx'), PASSWORD)
    expect(await loadRing(host, 'nx', await keys(host.device))).not.toBeNull()
    expect(heldRing('nx')).not.toBeNull()

    await forgetKeys(host, 'nx')

    expect(heldRing('nx')).toBeNull()
    expect([...map.keys()]).toEqual([])
  })
})
