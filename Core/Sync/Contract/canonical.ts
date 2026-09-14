import type { RouteTable } from './wire'

export const ROUTES = {
  connect: { method: 'POST', path: '/connect' },
  devices: { method: 'POST', path: '/devices' },
  approve: { method: 'POST', path: '/approve' },
  revoke: { method: 'POST', path: '/revoke' },
  info: { method: 'POST', path: '/info' },
  ring: { method: 'POST', path: '/ring' },
  store: { method: 'POST', path: '/store' },
} as const satisfies { [K in keyof RouteTable]: Pick<RouteTable[K], 'method' | 'path'> }

export const blobPath = (nexusId: string, sha256: string): string => `/blob/${nexusId}/${sha256}`

export function canonicalString(
  method: string,
  path: string,
  bodySha256Hex: string,
  timestampMs: number,
): string {
  return [method.toUpperCase(), path, bodySha256Hex, String(timestampMs)].join('\n')
}
