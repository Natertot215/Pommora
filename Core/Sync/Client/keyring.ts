import type { InfoRecord, RingEntry } from '../Contract/wire'
import { deriveWrappingKey } from '../Keys/kdf'
import { type Ring, unwrapForDevice, unwrapWithPassword } from '../Keys/ring'
import type { SyncHost } from './call'

type Keys = Pick<InfoRecord, 'ring' | 'kdf'>

const held = new Map<string, Ring>()

export const passwordName = (nexusId: string): string => `sync:${nexusId}:password`
export const ringName = (nexusId: string): string => `sync:${nexusId}:ring`

export const heldRing = (nexusId: string): Ring | null => held.get(nexusId) ?? null

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

export async function loadRing(
  host: SyncHost,
  nexusId: string,
  info: Keys | null,
): Promise<Ring | null> {
  const already = held.get(nexusId)
  if (already) return already
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
  if (info === null) return null
  const password = await host.secrets.get(passwordName(nexusId))
  const byPassword = info.ring.filter((entry) => entry.holder === 'password')
  if (password === null || byPassword.length === 0) return null
  const ring = await attempt(async () =>
    unwrapWithPassword(byPassword, await deriveWrappingKey(password, info.kdf)),
  )
  if (ring !== null) held.set(nexusId, ring)
  return ring
}

export async function refreshRing(
  host: SyncHost,
  nexusId: string,
  info: Keys,
): Promise<Ring | null> {
  held.delete(nexusId)
  return loadRing(host, nexusId, info)
}

export async function forgetKeys(host: SyncHost, nexusId: string): Promise<void> {
  held.delete(nexusId)
  await host.secrets.set(passwordName(nexusId), null)
  await host.secrets.set(ringName(nexusId), null)
}
