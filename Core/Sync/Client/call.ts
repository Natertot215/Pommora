import type { HostContext, HostDevice } from '../../Contract/handlers'
import { machine } from '../../Platform/machine'
import { blobPath, canonicalString, ROUTES } from '../Contract/canonical'
import type { RouteTable, SignedHeaders } from '../Contract/wire'

export const JSON_TIMEOUT_MS = 10_000
export const BLOB_TIMEOUT_MS = 300_000

export interface SyncHost {
  device: HostDevice
  transport: HostContext['transport']
  secrets: HostContext['secrets']
  push: HostContext['push']
}

export interface SyncTarget {
  address: string
  pin?: string | null
}

export function syncHost(ctx: HostContext): SyncHost | null {
  const device = ctx.device
  if (device === null) return null
  return { device, transport: ctx.transport, secrets: ctx.secrets, push: ctx.push }
}

export type Refusal = { error: string } & Record<string, unknown>

/** `error` is present only on a status of 0: a refusal before any reply was read, by the transport, the signer, or an unparseable body. `refusal` is the hub's own JSON on any other non-200. */
export interface CallOutcome<K extends keyof RouteTable> {
  status: number
  reply: RouteTable[K]['reply'] | null
  refusal?: Refusal
  error?: string
}

async function signedHeaders(
  host: SyncHost,
  method: string,
  path: string,
  bodySha256Hex: string,
): Promise<SignedHeaders> {
  const ts = Date.now()
  return {
    'x-pommora-device': host.device.id,
    'x-pommora-timestamp': String(ts),
    'x-pommora-signature': await host.device.sign(canonicalString(method, path, bodySha256Hex, ts)),
  }
}

const urlOf = (target: SyncTarget, path: string): string => target.address.replace(/\/$/, '') + path

function refusalOf(body: string): Refusal | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return undefined
  }
  return typeof parsed === 'object' &&
    parsed !== null &&
    typeof (parsed as Refusal).error === 'string'
    ? (parsed as Refusal)
    : undefined
}

export async function call<K extends keyof RouteTable>(
  host: SyncHost,
  target: SyncTarget,
  route: K,
  body: RouteTable[K]['body'],
  opts?: { timeoutMs?: number },
): Promise<CallOutcome<K>> {
  const { method, path } = ROUTES[route]
  const json = JSON.stringify(body)
  try {
    const reply = await host.transport({
      url: urlOf(target, path),
      method,
      headers: {
        'content-type': 'application/json',
        ...(await signedHeaders(host, method, path, machine().sha256Hex(json))),
      },
      body: json,
      pin: target.pin ?? undefined,
      timeoutMs: opts?.timeoutMs ?? JSON_TIMEOUT_MS,
    })
    return reply.status === 200
      ? { status: 200, reply: JSON.parse(reply.body) as RouteTable[K]['reply'] }
      : { status: reply.status, reply: null, refusal: refusalOf(reply.body) }
  } catch (e) {
    return { status: 0, reply: null, error: String(e) }
  }
}

export async function putBlob(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
  keyId: string,
  bytes: Uint8Array,
): Promise<{ status: number; error?: string }> {
  const sha = machine().sha256Hex(bytes)
  const path = blobPath(nexusId, sha)
  try {
    const reply = await host.transport({
      url: urlOf(target, path),
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
        'x-pommora-key': keyId,
        ...(await signedHeaders(host, 'PUT', path, sha)),
      },
      body: bytes,
      pin: target.pin ?? undefined,
      timeoutMs: BLOB_TIMEOUT_MS,
    })
    return { status: reply.status }
  } catch (e) {
    return { status: 0, error: String(e) }
  }
}

export async function getBlob(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
  sha256: string,
): Promise<Uint8Array | null> {
  const path = blobPath(nexusId, sha256)
  try {
    const reply = await host.transport({
      url: urlOf(target, path),
      method: 'GET',
      headers: await signedHeaders(host, 'GET', path, machine().sha256Hex('')),
      pin: target.pin ?? undefined,
      timeoutMs: BLOB_TIMEOUT_MS,
    })
    return reply.status === 200 ? reply.bytes : null
  } catch {
    return null
  }
}
