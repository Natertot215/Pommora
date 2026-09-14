import { createPublicKey, verify } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Store } from './Store/open.ts'
import { canonical, fingerprintOf, PUBLIC_KEY, refuse, type Reply } from './wire.ts'

const WINDOW_MS = 5 * 60_000

type Signature = { device: string; ts: number; sig: string }

export interface Identity {
  device: string
  publicKey: string
  signed: Signature
}

function header(req: IncomingMessage, name: string): string | null {
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

export function verifySigned(
  path: string,
  bodySha256Hex: string,
  signed: Signature,
  publicKey: string,
): Reply | null {
  try {
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: publicKey },
      format: 'jwk',
    })
    const data = Buffer.from(canonical('POST', path, bodySha256Hex, signed.ts), 'utf8')
    return verify(null, data, key, Buffer.from(signed.sig, 'base64url'))
      ? null
      : refuse(401, 'unauthorized')
  } catch {
    return refuse(400, 'bad-key')
  }
}

export function identify(
  store: Store,
  req: IncomingMessage,
  route: keyof Wire.RouteTable,
  body: unknown,
): Identity | Reply {
  const signed = signatureOf(req)
  if (!signed) return refuse(401, 'unauthorized')
  let publicKey: string
  if (route === 'connect') {
    const claimed = (body as Partial<Wire.ConnectBody> | null)?.publicKey
    if (typeof claimed !== 'string' || !PUBLIC_KEY.test(claimed)) return refuse(400, 'malformed')
    if (fingerprintOf(claimed) !== signed.device) return refuse(401, 'unauthorized')
    publicKey = claimed
  } else {
    const stored = store.roster.publicKeyOf(signed.device)
    if (stored === null) return refuse(404, 'not-found')
    publicKey = stored
  }
  return { device: signed.device, publicKey, signed }
}
