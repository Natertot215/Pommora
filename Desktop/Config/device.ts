// The private key lives in this process as a CryptoKey this module never hands out.

import { hostname } from 'node:os'
import type { HostDevice } from '@pommora/core/Contract/handlers'
import type { SyncDevice } from '@pommora/core/Sync/contract'
import { readAppConfig, updateAppConfig } from './appConfig'
import { getSecret, KEYCHAIN_UNAVAILABLE, secretsAvailable, setSecret } from './secrets'

const SECRET = 'device-key'
const AGREEMENT_SECRET = 'device-x25519'

async function fingerprintOf(raw: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', raw)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function mintPair(
  userDataDir: string,
  algorithm: 'Ed25519' | 'X25519',
  usages: Parameters<SubtleCrypto['generateKey']>[2],
  secretName: string,
): Promise<{ raw: ArrayBuffer; key: CryptoKey }> {
  const pair = await globalThis.crypto.subtle.generateKey(algorithm, true, usages)
  if (!('privateKey' in pair)) throw new Error(`${algorithm} generated no key pair.`)
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', pair.privateKey)
  await setSecret(userDataDir, secretName, Buffer.from(pkcs8).toString('base64'))
  return { raw, key: pair.privateKey }
}

async function mint(userDataDir: string): Promise<{ device: SyncDevice; key: CryptoKey }> {
  if (!secretsAvailable()) throw new Error(KEYCHAIN_UNAVAILABLE)
  // The config gives up its device before the store takes the new private key, so a config never
  // names a public key while the store holds a different private half: any crash mid-mint re-mints.
  await updateAppConfig(userDataDir, () => ({ device: undefined }))
  const { raw, key } = await mintPair(userDataDir, 'Ed25519', ['sign', 'verify'], SECRET)
  const device: SyncDevice = {
    id: await fingerprintOf(raw),
    publicKey: Buffer.from(raw).toString('base64url'),
    name: hostname().slice(0, 64),
  }
  await updateAppConfig(userDataDir, () => ({ device }))
  return { device, key }
}

async function load(userDataDir: string): Promise<CryptoKey | null> {
  const secret = await getSecret(userDataDir, SECRET)
  if (secret === null) return null
  return globalThis.crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(Buffer.from(secret, 'base64')),
    'Ed25519',
    false,
    ['sign'],
  )
}

async function ensureAgreementKey(
  userDataDir: string,
  stored: SyncDevice,
): Promise<{ x25519: string; key: CryptoKey }> {
  if (stored.x25519) {
    const secret = await getSecret(userDataDir, AGREEMENT_SECRET)
    if (secret !== null) {
      const key = await globalThis.crypto.subtle.importKey(
        'pkcs8',
        new Uint8Array(Buffer.from(secret, 'base64')),
        'X25519',
        false,
        ['deriveBits'],
      )
      return { x25519: stored.x25519, key }
    }
    console.error('Agreement key missing from the secret store; minting a new one')
  }
  const { raw, key } = await mintPair(userDataDir, 'X25519', ['deriveBits'], AGREEMENT_SECRET)
  const x25519 = Buffer.from(raw).toString('base64url')
  await updateAppConfig(userDataDir, () => ({ device: { ...stored, x25519 } }))
  return { x25519, key }
}

export async function ensureDevice(userDataDir: string): Promise<HostDevice> {
  const stored = (await readAppConfig(userDataDir)).device
  const loaded = stored ? await load(userDataDir) : null
  if (stored && !loaded) {
    console.error('Device key missing from the secret store; minting a new identity')
  }
  const { device, key } =
    stored && loaded ? { device: stored, key: loaded } : await mint(userDataDir)
  const agreement = await ensureAgreementKey(userDataDir, device)
  const record: SyncDevice = { ...device, x25519: agreement.x25519 }
  const host: HostDevice = {
    ...record,
    async sign(canonical: string): Promise<string> {
      const signature = await globalThis.crypto.subtle.sign(
        'Ed25519',
        key,
        new TextEncoder().encode(canonical),
      )
      return Buffer.from(signature).toString('base64url')
    },
    async agree(peerPublicKey: string): Promise<Uint8Array> {
      const peer = await globalThis.crypto.subtle.importKey(
        'raw',
        new Uint8Array(Buffer.from(peerPublicKey, 'base64url')),
        'X25519',
        false,
        [],
      )
      const bits = await globalThis.crypto.subtle.deriveBits(
        { name: 'X25519', public: peer },
        agreement.key,
        256,
      )
      return new Uint8Array(bits)
    },
    async rename(name: string): Promise<void> {
      await updateAppConfig(userDataDir, () => ({ device: { ...record, name } }))
      host.name = name
    },
  }
  return host
}
