import { createHash } from 'node:crypto'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

export const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
export const PUBLIC_KEY = /^[A-Za-z0-9_-]{43}$/
export const SHA256 = /^[0-9a-f]{64}$/

export const KEY_ID_MAX = 64

export function fingerprintOf(publicKey: string): string {
  return createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex')
}

export const sha256Hex = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')

export function canonical(method: string, path: string, bodySha256Hex: string, ts: number): string {
  return [method.toUpperCase(), path, bodySha256Hex, String(ts)].join('\n')
}

export const PATHS = {
  connect: '/connect',
  devices: '/devices',
  approve: '/approve',
  revoke: '/revoke',
  info: '/info',
  ring: '/ring',
  store: '/store',
  pull: '/pull',
} as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteTable[K]['path'] }

export const ROUTE_OF = Object.fromEntries(
  Object.entries(PATHS).map(([name, path]) => [path, name]),
) as Record<string, keyof Wire.RouteTable>

export const LOOPBACK = '127.0.0.1'

export const JSON_CAP = 8192
export const JSON_TIMEOUT_MS = 10_000

export const META = {
  connect: { requires: 'none', cap: JSON_CAP, timeoutMs: JSON_TIMEOUT_MS },
  devices: { requires: 'reader', cap: JSON_CAP, timeoutMs: JSON_TIMEOUT_MS },
  approve: { requires: 'editor', cap: JSON_CAP, timeoutMs: JSON_TIMEOUT_MS },
  revoke: { requires: 'owner', cap: JSON_CAP, timeoutMs: JSON_TIMEOUT_MS },
  info: { requires: 'reader', cap: 65536, timeoutMs: JSON_TIMEOUT_MS },
  ring: { requires: 'editor', cap: 65536, timeoutMs: JSON_TIMEOUT_MS },
  store: { requires: 'editor', cap: 262144, timeoutMs: JSON_TIMEOUT_MS },
  pull: { requires: 'reader', cap: JSON_CAP, timeoutMs: 35_000 },
} as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteMeta }

const bare = (pattern: RegExp): string => pattern.source.replace(/^\^|\$$/g, '')

export const BLOB_ROUTE = new RegExp(`^/blob/(${bare(ULID)})/(${bare(SHA256)})$`)
export const BLOB_CAP = 50 * 1024 * 1024
export const BLOB_TIMEOUT_MS = 300_000

export const blobPath = (nexusId: string, sha256: string): string => `/blob/${nexusId}/${sha256}`

const ROLE_ORDER = ['reader', 'editor', 'owner'] as const

export const permits = (role: Wire.Role | null, need: Wire.Role): boolean =>
  role !== null && ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(need)

export type Reply = { status: number; body: object }

export function refuse(status: number, error: string, extra?: object): Reply {
  return { status, body: { error, ...extra } }
}

export const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

export const whole = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max

export const MALFORMED = Symbol('malformed')

export function parseBody(raw: Buffer): unknown {
  if (raw.length === 0) return null
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return MALFORMED
  }
}
