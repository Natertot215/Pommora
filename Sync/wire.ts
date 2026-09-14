import { createHash } from 'node:crypto'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

export const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
export const PUBLIC_KEY = /^[A-Za-z0-9_-]{43}$/

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
} as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteTable[K]['path'] }

export const ROUTES = Object.keys(PATHS) as (keyof Wire.RouteTable)[]

export const JSON_TIMEOUT_MS = 10_000

export const META = {
  connect: { requires: 'none', cap: 8192, timeoutMs: JSON_TIMEOUT_MS },
  devices: { requires: 'reader', cap: 8192, timeoutMs: JSON_TIMEOUT_MS },
  approve: { requires: 'editor', cap: 8192, timeoutMs: JSON_TIMEOUT_MS },
  revoke: { requires: 'owner', cap: 8192, timeoutMs: JSON_TIMEOUT_MS },
} as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteMeta }

export const ROLE_ORDER = ['reader', 'editor', 'owner'] as const

export type Reply = { status: number; body: object }

export function refuse(status: number, error: string): Reply {
  return { status, body: { error } }
}

export const MALFORMED = Symbol('malformed')

export function parseBody(raw: Buffer): unknown {
  if (raw.length === 0) return null
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return MALFORMED
  }
}
