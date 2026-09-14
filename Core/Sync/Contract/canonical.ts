import type { RouteTable } from './wire'

export const ROUTES = {
  connect: { method: 'POST', path: '/connect' },
  devices: { method: 'POST', path: '/devices' },
  approve: { method: 'POST', path: '/approve' },
  revoke: { method: 'POST', path: '/revoke' },
  info: { method: 'POST', path: '/info' },
  ring: { method: 'POST', path: '/ring' },
  store: { method: 'POST', path: '/store' },
  pull: { method: 'POST', path: '/pull' },
} as const satisfies { [K in keyof RouteTable]: Pick<RouteTable[K], 'method' | 'path'> }

export const blobPath = (nexusId: string, sha256: string): string => `/blob/${nexusId}/${sha256}`

// The canonical string is the uppercased method, the path, the lowercase hex SHA-256 of the UTF-8
// request body, or of the raw bytes on a byte route (of the empty string when there is none), and
// the integer millisecond timestamp, joined by \n. The signature is Ed25519 over the UTF-8 canonical
// string, base64url. The server refuses a timestamp more than five minutes from its clock.
export function canonicalString(
  method: string,
  path: string,
  bodySha256Hex: string,
  timestampMs: number,
): string {
  return [method.toUpperCase(), path, bodySha256Hex, String(timestampMs)].join('\n')
}
