// A device id is the lowercase hex SHA-256 of the 32 raw Ed25519 public-key bytes.
// The public key travels as unpadded base64url, 43 characters.

// The canonical string is the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8
// request body (of the empty string when there is none), and the integer millisecond timestamp,
// joined by \n. The signature is Ed25519 over the UTF-8 canonical string, base64url. The server
// refuses a timestamp more than five minutes from its clock.

export interface SyncDevice {
  id: string
  publicKey: string
  name: string
}

export type DeviceRecord = SyncDevice & { approved: boolean }

export interface ConnectBody {
  nexusId: string
  publicKey: string
  name: string
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

export interface RouteTable {
  connect: { method: 'POST'; path: '/connect'; body: ConnectBody; reply: ConnectReply }
  devices: { method: 'POST'; path: '/devices'; body: NexusBody; reply: DevicesReply }
  approve: { method: 'POST'; path: '/approve'; body: DeviceBody; reply: DevicesReply }
  revoke: { method: 'POST'; path: '/revoke'; body: DeviceBody; reply: DevicesReply }
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

export interface SignedHeaders {
  'x-pommora-device': string
  'x-pommora-timestamp': string
  'x-pommora-signature': string
}
