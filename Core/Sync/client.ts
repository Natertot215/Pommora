import type { HostContext, HostDevice } from '../Contract/handlers'
import { machine } from '../Platform/machine'
import { canonicalString, ROUTES } from './authority'
import type { RouteTable, SignedHeaders } from './contract'

export interface SyncHost {
  device: HostDevice
  transport: HostContext['transport']
}

/** `error` is present only on a status of 0: a refusal before any reply was read, by the transport, the signer, or an unparseable body. */
export interface CallOutcome<K extends keyof RouteTable> {
  status: number
  reply: RouteTable[K]['reply'] | null
  error?: string
}

export async function call<K extends keyof RouteTable>(
  host: SyncHost,
  address: string,
  route: K,
  body: RouteTable[K]['body'],
): Promise<CallOutcome<K>> {
  const { method, path } = ROUTES[route]
  const json = JSON.stringify(body)
  const ts = Date.now()
  try {
    const canonical = canonicalString(method, path, machine().sha256Hex(json), ts)
    const headers: SignedHeaders & { 'content-type': string } = {
      'content-type': 'application/json',
      'x-pommora-device': host.device.id,
      'x-pommora-timestamp': String(ts),
      'x-pommora-signature': await host.device.sign(canonical),
    }
    const reply = await host.transport({
      url: address.replace(/\/$/, '') + path,
      method,
      headers,
      body: json,
    })
    return {
      status: reply.status,
      reply: reply.status === 200 ? (JSON.parse(reply.body) as RouteTable[K]['reply']) : null,
    }
  } catch (e) {
    return { status: 0, reply: null, error: String(e) }
  }
}
