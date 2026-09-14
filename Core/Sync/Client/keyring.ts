import type { InfoRecord, ItemRecord, RingEntry } from '../Contract/wire'
import { decryptItem } from '../Keys/item'
import { deriveWrappingKey } from '../Keys/kdf'
import { owned, type Ring, unwrapForDevice, unwrapWithPassword } from '../Keys/ring'
import { call, type SyncHost } from './call'
import type { Session } from './session'

type Keys = Pick<InfoRecord, 'ring' | 'kdf'>

const held = new Map<string, Ring>()

export const passwordName = (nexusId: string): string => `sync:${nexusId}:password`
export const ringName = (nexusId: string): string => `sync:${nexusId}:ring`

export const heldRing = (nexusId: string): Ring | null => held.get(nexusId) ?? null

export const forgetHeldRing = (nexusId: string): void => {
  held.delete(nexusId)
}

const attempt = async (open: () => Promise<Ring>): Promise<Ring | null> => {
  try {
    return await open()
  } catch {
    return null
  }
}

function cached(json: string | null): RingEntry[] {
  if (json === null) return []
  try {
    const parsed: unknown = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as RingEntry[]) : []
  } catch {
    return []
  }
}

async function openWithPassword(info: Keys, password: string): Promise<Ring | null> {
  const entries = info.ring.filter((entry) => entry.holder === 'password')
  if (entries.length === 0) return null
  return attempt(async () =>
    unwrapWithPassword(entries, await deriveWrappingKey(password, info.kdf)),
  )
}

export async function loadRing(
  host: SyncHost,
  nexusId: string,
  info: Keys | null,
  password: string | null,
): Promise<Ring | null> {
  let offered: Ring | null = null
  if (password !== null && info !== null) {
    offered = await openWithPassword(info, password)
    if (offered === null) return null
  }
  if (info === null) {
    const already = held.get(nexusId)
    if (already !== undefined) return already
  }
  const own = (info?.ring ?? cached(await host.secrets.get(ringName(nexusId)))).filter(
    (entry) => entry.holder === host.device.id,
  )
  if (own.length > 0) {
    const ring = await attempt(() => unwrapForDevice(own, host.device.id, host.device.agree))
    if (ring !== null) {
      await host.secrets.set(ringName(nexusId), JSON.stringify(own))
      held.set(nexusId, ring)
      return ring
    }
  }
  if (offered !== null) {
    held.set(nexusId, offered)
    return offered
  }
  if (info === null) return null
  const stored = await host.secrets.get(passwordName(nexusId))
  if (stored === null) return null
  const ring = await openWithPassword(info, stored)
  if (ring !== null) held.set(nexusId, ring)
  return ring
}

async function reloaded(session: Session): Promise<Ring | null> {
  const outcome = await call(session.host, session.target, 'info', { nexusId: session.nexusId })
  if (outcome.reply === null) return null
  return loadRing(session.host, session.nexusId, outcome.reply.info, null)
}

export async function openRecord(
  session: Session,
  record: ItemRecord,
  blob: Uint8Array,
): Promise<Uint8Array> {
  const bytes = owned(blob)
  try {
    return await decryptItem(session.ring, record.keyId, record.path, bytes)
  } catch (e) {
    if (!String(e).includes('unknown-key')) throw e
    const ring = await reloaded(session)
    if (ring === null) throw e
    session.ring = ring
    return decryptItem(ring, record.keyId, record.path, bytes)
  }
}

export async function forgetKeys(host: SyncHost, nexusId: string): Promise<void> {
  held.delete(nexusId)
  await host.secrets.set(passwordName(nexusId), null)
  await host.secrets.set(ringName(nexusId), null)
}
