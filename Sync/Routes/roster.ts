import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Identity } from '../authority.ts'
import type { Store } from '../Store/open.ts'
import { refuse, type Reply, ULID } from '../wire.ts'

const nexusOf = (body: unknown): string | null => {
  const id = (body as Partial<Wire.NexusBody> | null)?.nexusId
  return typeof id === 'string' && ULID.test(id) ? id : null
}

const targetOf = (body: unknown): string | null => {
  const id = (body as Partial<Wire.DeviceBody> | null)?.deviceId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function rosterRoutes(store: Store) {
  const { roster } = store

  return {
    connect: (id: Identity, body: unknown): Reply => {
      const b = body as Partial<Wire.ConnectBody> | null
      const nexusId = nexusOf(b)
      const name = typeof b?.name === 'string' ? b.name.trim() : ''
      if (!nexusId) return refuse(400, 'malformed')
      if (name.length < 1 || name.length > 64) return refuse(400, 'malformed')
      roster.upsertDevice(id.device, id.publicKey, name)
      const seeded = roster.hasMembers(nexusId)
      roster.addMembership(nexusId, id.device, seeded ? 0 : 1)
      return { status: 200, body: { approved: roster.isApproved(nexusId, id.device) } }
    },

    devices: (id: Identity, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      if (!nexusId) return refuse(400, 'malformed')
      if (!roster.isApproved(nexusId, id.device)) return refuse(404, 'not-found')
      return { status: 200, body: { devices: roster.list(nexusId) } }
    },

    approve: (id: Identity, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      const deviceId = targetOf(body)
      if (!nexusId || !deviceId) return refuse(400, 'malformed')
      if (!roster.isApproved(nexusId, id.device)) return refuse(404, 'not-found')
      if (roster.approve(nexusId, deviceId) === 0) return refuse(409, 'no-such-device')
      return { status: 200, body: { devices: roster.list(nexusId) } }
    },

    revoke: (id: Identity, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      const deviceId = targetOf(body)
      if (!nexusId || !deviceId) return refuse(400, 'malformed')
      if (!roster.isApproved(nexusId, id.device)) return refuse(404, 'not-found')
      if (deviceId === id.device) return refuse(400, 'self-revoke')
      roster.revoke(nexusId, deviceId)
      return { status: 200, body: { devices: roster.list(nexusId) } }
    },
  } satisfies { [K in keyof Wire.RouteTable]: (id: Identity, body: unknown) => Reply }
}
