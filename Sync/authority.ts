import { createPublicKey, verify as verifyEd25519 } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Store } from './Store/open.ts'
import {
  canonical,
  fingerprintOf,
  META,
  permits,
  PUBLIC_KEY,
  refuse,
  type Reply,
  ULID,
} from './wire.ts'

const WINDOW_MS = 5 * 60_000

type Signature = { device: string; ts: number; sig: string }

type Handler = (id: Identity, body: unknown) => Reply | Promise<Reply>

export type Routes<K extends keyof Wire.RouteTable> = Record<K, Handler>

export interface Identity {
  device: string
  publicKey: string
  nexusId: string
  role: Wire.Role | null
  approved: boolean
  signed: Signature
}

export function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function signatureOf(req: IncomingMessage): Signature | null {
  const device = header(req, 'x-pommora-device')
  const rawTs = header(req, 'x-pommora-timestamp')
  const sig = header(req, 'x-pommora-signature')
  if (!device || !rawTs || !sig) return null
  const ts = Number(rawTs)
  if (!Number.isInteger(ts) || Math.abs(Date.now() - ts) > WINDOW_MS) return null
  return { device, ts, sig }
}

export function identify(
  store: Store,
  req: IncomingMessage,
  route: keyof Wire.RouteTable | null,
  body: unknown,
  given?: string,
  requires?: Wire.Role | 'none',
): Identity | Reply {
  const signed = signatureOf(req)
  if (!signed) return refuse(401, 'unauthorized')
  const nexusId = given ?? (body as Partial<Wire.NexusBody> | null)?.nexusId
  if (typeof nexusId !== 'string' || !ULID.test(nexusId)) return refuse(400, 'malformed')
  let publicKey: string
  if (route === 'connect') {
    const claimed = (body as Partial<Wire.ConnectBody> | null)?.publicKey
    if (typeof claimed !== 'string' || !PUBLIC_KEY.test(claimed)) return refuse(400, 'malformed')
    if (fingerprintOf(claimed) !== signed.device) return refuse(401, 'unauthorized')
    publicKey = claimed
  } else {
    const stored = store.roster.publicKeyOf(signed.device)
    if (stored === null) return refuse(401, 'unauthorized')
    publicKey = stored
  }
  const membership = store.roster.membership(nexusId, signed.device)
  const id: Identity = {
    device: signed.device,
    publicKey,
    nexusId,
    role: membership?.role ?? null,
    approved: membership?.approved ?? false,
    signed,
  }
  const need = requires ?? (route === null ? 'none' : META[route].requires)
  if (need === 'none') return id
  if (!id.approved || !permits(id.role, need)) return refuse(404, 'not-found')
  return id
}

export function verify(
  id: Identity,
  method: string,
  path: string,
  bodySha256Hex: string,
): Reply | null {
  try {
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: id.publicKey },
      format: 'jwk',
    })
    const data = Buffer.from(canonical(method, path, bodySha256Hex, id.signed.ts), 'utf8')
    return verifyEd25519(null, data, key, Buffer.from(id.signed.sig, 'base64url'))
      ? null
      : refuse(401, 'unauthorized')
  } catch {
    return refuse(400, 'bad-key')
  }
}
