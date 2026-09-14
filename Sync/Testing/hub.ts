import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { TLSSocket } from 'node:tls'
import { start } from '../hub.ts'
import { STORE_FILE } from '../Store/open.ts'
import { blobPath, canonical, fingerprintOf, LOOPBACK, sha256Hex } from '../wire.ts'

export const NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

export type Hub = { dataDir: string; port: number; pin: string | null; close(): Promise<void> }

let base = ''

export async function boot(
  opts: { dataDir?: string; timeoutMs?: number; tls?: { cert: string; key: string } } = {},
): Promise<Hub> {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'pommora-sync-'))
  const running = await start({ dataDir, port: 0, timeoutMs: opts.timeoutMs, tls: opts.tls })
  base = `${opts.tls ? 'https' : 'http'}://${LOOPBACK}:${running.port}`
  return { dataDir, port: running.port, pin: running.pin, close: running.close }
}

export function withDb<T>(dataDir: string, read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(join(dataDir, STORE_FILE))
  try {
    return read(db)
  } finally {
    db.close()
  }
}

export function setRole(dataDir: string, fingerprint: string, role: Wire.Role): void {
  withDb(dataDir, (db) => {
    db.prepare('UPDATE membership SET role = ? WHERE nexus_id = ? AND fingerprint = ?').run(
      role,
      NEXUS,
      fingerprint,
    )
  })
}

type Outcome = { status: number; body: unknown; bytes: Buffer; pin: string | null }

function send(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer,
): Promise<Outcome> {
  const secure = url.startsWith('https:')
  const options = { method, headers, ...(secure && { rejectUnauthorized: false }) }
  return new Promise((resolve, reject) => {
    let settled = false
    const answer = (res: IncomingMessage): void => {
      const pin = secure
        ? ((res.socket as TLSSocket).getPeerCertificate().fingerprint256 ?? null)
        : null
      const chunks: Buffer[] = []
      const done = (): void => {
        if (settled) return
        settled = true
        const bytes = Buffer.concat(chunks)
        const text = bytes.toString('utf8')
        let parsed: unknown = null
        try {
          parsed = text.length > 0 ? JSON.parse(text) : null
        } catch {
          parsed = null
        }
        resolve({ status: res.statusCode ?? 0, body: parsed, bytes, pin })
      }
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      res.on('end', done)
      res.on('close', done)
    }
    const req = secure ? httpsRequest(url, options, answer) : httpRequest(url, options, answer)
    req.on('error', (e) => {
      if (settled) return
      settled = true
      reject(e)
    })
    req.end(body)
  })
}

export function signer(name: string) {
  const pair = generateKeyPairSync('ed25519')
  const publicKey = String(pair.publicKey.export({ format: 'jwk' }).x)
  const id = fingerprintOf(publicKey)
  const agreement = generateKeyPairSync('x25519')
  const x25519 = String(agreement.publicKey.export({ format: 'jwk' }).x)

  const signed = (method: string, path: string, raw: Buffer, ts: number) => ({
    'x-pommora-device': id,
    'x-pommora-timestamp': String(ts),
    'x-pommora-signature': sign(
      null,
      Buffer.from(canonical(method, path, sha256Hex(raw), ts), 'utf8'),
      pair.privateKey,
    ).toString('base64url'),
  })

  function call(
    path: string,
    body: unknown,
    tweak?: { ts?: number; signature?: string },
  ): Promise<Outcome> {
    const raw = Buffer.from(body === undefined ? '' : JSON.stringify(body), 'utf8')
    const headers = signed('POST', path, raw, tweak?.ts ?? Date.now())
    if (tweak?.signature) headers['x-pommora-signature'] = tweak.signature
    return send(base + path, 'POST', { 'content-type': 'application/json', ...headers }, raw)
  }

  function put(
    nexusId: string,
    keyId: string,
    bytes: Buffer,
    at?: string,
    sealed = bytes,
  ): Promise<Outcome> {
    const path = at ?? blobPath(nexusId, sha256Hex(sealed))
    return send(
      base + path,
      'PUT',
      {
        'content-type': 'application/octet-stream',
        'x-pommora-key': keyId,
        ...signed('PUT', path, sealed, Date.now()),
      },
      bytes,
    )
  }

  function get(nexusId: string, sha256: string): Promise<Outcome> {
    const path = blobPath(nexusId, sha256)
    const empty = Buffer.alloc(0)
    return send(base + path, 'GET', signed('GET', path, empty, Date.now()), empty)
  }

  return { id, publicKey, name, x25519, call, put, get }
}

export type Signer = ReturnType<typeof signer>

export const connectBody = (s: Signer, nexusId: string) => ({
  nexusId,
  publicKey: s.publicKey,
  name: s.name,
  x25519: s.x25519,
})

export async function bootWith(cast: {
  owner: Signer
  editor?: Signer
  reader?: Signer
}): Promise<Hub> {
  const hub = await boot()
  await cast.owner.call('/connect', connectBody(cast.owner, NEXUS))
  const roles = [
    ['editor', cast.editor],
    ['reader', cast.reader],
  ] as const
  for (const [role, who] of roles) {
    if (who === undefined) continue
    await who.call('/connect', connectBody(who, NEXUS))
    await cast.owner.call('/approve', { nexusId: NEXUS, deviceId: who.id })
    setRole(hub.dataDir, who.id, role)
  }
  return hub
}
