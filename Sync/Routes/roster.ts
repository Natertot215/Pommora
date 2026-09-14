import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Identity } from '../authority.ts'
import type { Store } from '../Store/open.ts'
import { PUBLIC_KEY, refuse, type Reply } from '../wire.ts'

const targetOf = (body: unknown): string | null => {
  const id = (body as Partial<Wire.DeviceBody> | null)?.deviceId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function rosterRoutes(store: Store) {
  const { roster } = store

  return {
    connect: (id: Identity, body: unknown): Reply => {
      const b = body as Partial<Wire.ConnectBody> | null
      const name = typeof b?.name === 'string' ? b.name.trim() : ''
      if (name.length < 1 || name.length > 64) return refuse(400, 'malformed')
      const x25519 = b?.x25519
      if (x25519 !== undefined && (typeof x25519 !== 'string' || !PUBLIC_KEY.test(x25519))) {
        return refuse(400, 'malformed')
      }
      roster.upsertDevice(id.device, id.publicKey, name, x25519 ?? null)
      const seeded = roster.hasMembers(id.nexusId)
      roster.addMembership(id.nexusId, id.device, seeded ? 0 : 1, seeded ? 'editor' : 'owner')
      return {
        status: 200,
        body: { approved: roster.membership(id.nexusId, id.device)?.approved === true },
      }
    },

    devices: (id: Identity): Reply => ({
      status: 200,
      body: { devices: roster.list(id.nexusId) },
    }),

    approve: (id: Identity, body: unknown): Reply => {
      const deviceId = targetOf(body)
      if (!deviceId) return refuse(400, 'malformed')
      if (roster.approve(id.nexusId, deviceId) === 0) return refuse(409, 'no-such-device')
      return { status: 200, body: { devices: roster.list(id.nexusId) } }
    },

    revoke: (id: Identity, body: unknown): Reply => {
      const deviceId = targetOf(body)
      if (!deviceId) return refuse(400, 'malformed')
      if (deviceId === id.device) return refuse(400, 'self-revoke')
      roster.revoke(id.nexusId, deviceId)
      return { status: 200, body: { devices: roster.list(id.nexusId) } }
    },
  } satisfies { [K in keyof Wire.RouteTable]: (id: Identity, body: unknown) => Reply }
}
