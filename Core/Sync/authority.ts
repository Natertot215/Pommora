import type { RouteTable } from './contract'

export const ROUTES = {
  connect: { method: 'POST', path: '/connect' },
  devices: { method: 'POST', path: '/devices' },
  approve: { method: 'POST', path: '/approve' },
  revoke: { method: 'POST', path: '/revoke' },
} as const satisfies { [K in keyof RouteTable]: Pick<RouteTable[K], 'method' | 'path'> }

export function canonicalString(
  method: string,
  path: string,
  bodySha256Hex: string,
  timestampMs: number,
): string {
  return [method.toUpperCase(), path, bodySha256Hex, String(timestampMs)].join('\n')
}
