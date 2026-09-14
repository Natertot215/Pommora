import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { start } from '../hub.ts'
import { canonical, sha256Hex } from '../wire.ts'

let base = ''

export async function boot(
  dataDir = mkdtempSync(join(tmpdir(), 'pommora-sync-')),
  tls?: { cert: string; key: string },
): Promise<{ base: string; dataDir: string; pin: string | null; close(): Promise<void> }> {
  const running = await start({ dataDir, port: 0, tls })
  base = `${tls ? 'https' : 'http'}://127.0.0.1:${running.port}`
  return { base, dataDir, pin: running.pin, close: () => running.close() }
}

type Outcome = { status: number; body: unknown; pin: string | null }

function send(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; text: string; pin: string | null }> {
  const secure = url.startsWith('https:')
  const options = { method: 'POST', headers, rejectUnauthorized: false }
  return new Promise((resolve, reject) => {
    const answer = (res: IncomingMessage): void => {
      const socket = res.socket as { getPeerCertificate?: () => { fingerprint256?: string } }
      const pin = secure ? (socket.getPeerCertificate?.().fingerprint256 ?? null) : null
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        text += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text, pin }))
    }
    const req = secure ? httpsRequest(url, options, answer) : httpRequest(url, options, answer)
    req.on('error', reject)
    req.end(body)
  })
}

export function signer(name: string) {
  const pair = generateKeyPairSync('ed25519')
  const publicKey = String(pair.publicKey.export({ format: 'jwk' }).x)
  const id = createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex')
  const agreement = generateKeyPairSync('x25519')
  const x25519 = String(agreement.publicKey.export({ format: 'jwk' }).x)

  async function call(
    path: string,
    body: unknown,
    tweak?: { ts?: number; signature?: string },
  ): Promise<Outcome> {
    const json = body === undefined ? '' : JSON.stringify(body)
    const ts = tweak?.ts ?? Date.now()
    const raw = Buffer.from(json, 'utf8')
    const signature =
      tweak?.signature ??
      sign(
        null,
        Buffer.from(canonical('POST', path, sha256Hex(raw), ts), 'utf8'),
        pair.privateKey,
      ).toString('base64url')
    const answer = await send(
      base + path,
      {
        'content-type': 'application/json',
        'x-pommora-device': id,
        'x-pommora-timestamp': String(ts),
        'x-pommora-signature': signature,
      },
      json,
    )
    return {
      status: answer.status,
      body: answer.text.length > 0 ? JSON.parse(answer.text) : null,
      pin: answer.pin,
    }
  }

  return { id, publicKey, name, x25519, call }
}
