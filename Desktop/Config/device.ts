// One Ed25519 key per install: the public half, its fingerprint, and the machine's name in
// pommora.json, the PKCS8 private half in the secret store. The key exists in this process as a
// CryptoKey this module never hands out.

import { hostname } from 'node:os'
import type { HostDevice } from '@pommora/core/Contract/handlers'
import type { SyncDevice } from '@pommora/core/Sync/contract'
import { readAppConfig, updateAppConfig } from './appConfig'
import { getSecret, setSecret } from './secrets'

const SECRET = 'device-key'

async function fingerprintOf(raw: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', raw)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function mint(userDataDir: string): Promise<{ device: SyncDevice; key: CryptoKey }> {
  const pair = await globalThis.crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  if (!('privateKey' in pair)) throw new Error('Ed25519 generated no key pair.')
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', pair.privateKey)
  const device: SyncDevice = {
    id: await fingerprintOf(raw),
    publicKey: Buffer.from(raw).toString('base64url'),
    name: hostname(),
  }
  // The secret first: a crash between the two writes leaves a config that re-mints rather than one
  // naming a key nothing holds.
  await setSecret(userDataDir, SECRET, Buffer.from(pkcs8).toString('base64'))
  await updateAppConfig(userDataDir, () => ({ device }))
  return { device, key: pair.privateKey }
}

async function load(userDataDir: string): Promise<CryptoKey | null> {
  const secret = await getSecret(userDataDir, SECRET)
  if (secret === null) return null
  try {
    return await globalThis.crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(Buffer.from(secret, 'base64')),
      'Ed25519',
      false,
      ['sign'],
    )
  } catch {
    return null
  }
}

export async function ensureDevice(userDataDir: string): Promise<HostDevice> {
  const stored = (await readAppConfig(userDataDir)).device
  let device = stored ?? null
  let key = stored ? await load(userDataDir) : null
  if (device && !key) {
    console.error('Device key missing from the secret store; minting a new identity')
  }
  if (!device || !key) {
    const minted = await mint(userDataDir)
    device = minted.device
    key = minted.key
  }
  const state = device
  const signingKey = key
  return {
    get id() {
      return state.id
    },
    get publicKey() {
      return state.publicKey
    },
    get name() {
      return state.name
    },
    async sign(canonical: string): Promise<string> {
      const signature = await globalThis.crypto.subtle.sign(
        'Ed25519',
        signingKey,
        new TextEncoder().encode(canonical),
      )
      return Buffer.from(signature).toString('base64url')
    },
    async rename(name: string): Promise<void> {
      await updateAppConfig(userDataDir, () => ({ device: { ...state, name } }))
      state.name = name
    },
  }
}
