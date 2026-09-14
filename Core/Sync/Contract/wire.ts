// A device id is the lowercase hex SHA-256 of the 32 raw Ed25519 public-key bytes.
// The public key travels as unpadded base64url, 43 characters.

// The canonical string is the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8
// request body, or of the raw bytes on a byte route (of the empty string when there is none), and
// the integer millisecond timestamp, joined by \n. The signature is Ed25519 over the UTF-8 canonical
// string, base64url. The server refuses a timestamp more than five minutes from its clock.

export interface SyncDevice {
  id: string
  publicKey: string
  name: string
  /** The raw 32-byte X25519 public key, base64url. */
  x25519?: string
}

export type Role = 'owner' | 'editor' | 'reader'

export interface RouteMeta {
  requires: Role | 'none'
  cap: number
  timeoutMs: number
}

export type DeviceRecord = SyncDevice & { approved: boolean; role: Role }

export interface ConnectBody {
  nexusId: string
  publicKey: string
  name: string
  x25519?: string
}

export interface ConnectReply {
  approved: boolean
}

export interface NexusBody {
  nexusId: string
}

export interface DeviceBody {
  nexusId: string
  deviceId: string
}

export interface DevicesReply {
  devices: DeviceRecord[]
}

export interface KdfParams {
  hash: 'SHA-256'
  iterations: number
  salt: string
}

export interface RingEntry {
  keyId: string
  holder: 'password' | string
  wrapped: string
  createdMs: number
}

export interface InfoRecord {
  version: number
  protocol: 1
  kdf: KdfParams
  historyDays: number
  ring: RingEntry[]
}

export interface InfoBody {
  nexusId: string
  create?: Omit<InfoRecord, 'version'>
}

export interface InfoReply {
  info: InfoRecord
}

export interface RingBody {
  nexusId: string
  base: number
  add: RingEntry[]
}

export interface RouteTable {
  connect: { method: 'POST'; path: '/connect'; body: ConnectBody; reply: ConnectReply }
  devices: { method: 'POST'; path: '/devices'; body: NexusBody; reply: DevicesReply }
  approve: { method: 'POST'; path: '/approve'; body: DeviceBody; reply: DevicesReply }
  revoke: { method: 'POST'; path: '/revoke'; body: DeviceBody; reply: DevicesReply }
  info: { method: 'POST'; path: '/info'; body: InfoBody; reply: InfoReply }
  ring: { method: 'POST'; path: '/ring'; body: RingBody; reply: InfoReply }
}

export type SyncBinding = { address: string } & (
  | { state: 'approved'; devices: DeviceRecord[] }
  | { state: 'pending' }
  | { state: 'unreachable'; why: string }
)

export interface SyncState {
  device: SyncDevice
  binding: SyncBinding | null
}

export type SignedHeaders = {
  'x-pommora-device': string
  'x-pommora-timestamp': string
  'x-pommora-signature': string
}
