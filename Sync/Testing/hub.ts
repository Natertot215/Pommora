import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TLSSocket } from 'node:tls'
import { start } from '../hub.ts'
import { blobPath, canonical, fingerprintOf, LOOPBACK, sha256Hex } from '../wire.ts'

export const NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

let base = ''

export async function boot(
  opts: { dataDir?: string; timeoutMs?: number; tls?: { cert: string; key: string } } = {},
): Promise<{ dataDir: string; port: number; pin: string | null; close(): Promise<void> }> {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'pommora-sync-'))
  const running = await start({ dataDir, port: 0, timeoutMs: opts.timeoutMs, tls: opts.tls })
  base = `${opts.tls ? 'https' : 'http'}://${LOOPBACK}:${running.port}`
  return { dataDir, port: running.port, pin: running.pin, close: running.close }
}

type Outcome = { status: number; body: unknown; pin: string | null }

function send(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer,
): Promise<{ status: number; bytes: Buffer; pin: string | null }> {
  const secure = url.startsWith('https:')
  const options = { method, headers, ...(secure && { rejectUnauthorized: false }) }
  return new Promise((resolve, reject) => {
    const answer = (res: IncomingMessage): void => {
      const pin = secure
        ? ((res.socket as TLSSocket).getPeerCertificate().fingerprint256 ?? null)
        : null
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, bytes: Buffer.concat(chunks), pin }),
      )
    }
    const req = secure ? httpsRequest(url, options, answer) : httpRequest(url, options, answer)
    req.on('error', reject)
    req.end(body)
  })
}

export function signer(name: string) {
  const pair = generateKeyPairSync('ed25519')
  const publicKey = String(pair.publicKey.export({ format: 'jwk' }).x)
  const id = fingerprintOf(publicKey)
  const agreement = generateKeyPairSync('x25519')
  const x25519 = String(agreement.publicKey.export({ format: 'jwk' }).x)

  const signature = (method: string, path: string, bodySha256Hex: string, ts: number): string =>
    sign(
      null,
      Buffer.from(canonical(method, path, bodySha256Hex, ts), 'utf8'),
      pair.privateKey,
    ).toString('base64url')

  const signed = (method: string, path: string, raw: Buffer, ts: number) => ({
    'x-pommora-device': id,
    'x-pommora-timestamp': String(ts),
    'x-pommora-signature': signature(method, path, sha256Hex(raw), ts),
  })

  async function call(
    path: string,
    body: unknown,
    tweak?: { ts?: number; signature?: string },
  ): Promise<Outcome> {
    const json = body === undefined ? '' : JSON.stringify(body)
    const ts = tweak?.ts ?? Date.now()
    const raw = Buffer.from(json, 'utf8')
    const headers = signed('POST', path, raw, ts)
    if (tweak?.signature) headers['x-pommora-signature'] = tweak.signature
    const answer = await send(
      base + path,
      'POST',
      { 'content-type': 'application/json', ...headers },
      raw,
    )
    const text = answer.bytes.toString('utf8')
    return {
      status: answer.status,
      body: text.length > 0 ? JSON.parse(text) : null,
      pin: answer.pin,
    }
  }

  async function put(nexusId: string, keyId: string, bytes: Buffer, at?: string): Promise<Outcome> {
    const path = at ?? blobPath(nexusId, sha256Hex(bytes))
    const ts = Date.now()
    const answer = await send(
      base + path,
      'PUT',
      {
        'content-type': 'application/octet-stream',
        'x-pommora-key': keyId,
        ...signed('PUT', path, bytes, ts),
      },
      bytes,
    )
    const text = answer.bytes.toString('utf8')
    return {
      status: answer.status,
      body: text.length > 0 ? JSON.parse(text) : null,
      pin: answer.pin,
    }
  }

  async function get(nexusId: string, sha256: string): Promise<{ status: number; bytes: Buffer }> {
    const path = blobPath(nexusId, sha256)
    const ts = Date.now()
    const answer = await send(
      base + path,
      'GET',
      signed('GET', path, Buffer.alloc(0), ts),
      Buffer.alloc(0),
    )
    return { status: answer.status, bytes: answer.bytes }
  }

  return { id, publicKey, name, x25519, call, put, get }
}

export const connectBody = (s: ReturnType<typeof signer>, nexusId: string) => ({
  nexusId,
  publicKey: s.publicKey,
  name: s.name,
  x25519: s.x25519,
})
