import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { start } from '../hub.ts'
import { canonical, sha256Hex } from '../wire.ts'

let base = ''

export async function boot(
  dataDir = mkdtempSync(join(tmpdir(), 'pommora-sync-')),
): Promise<{ base: string; dataDir: string; close(): Promise<void> }> {
  const running = await start({ dataDir, port: 0 })
  base = `http://127.0.0.1:${running.port}`
  return { base, dataDir, close: () => running.close() }
}

type Outcome = { status: number; body: unknown }

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
    const response = await fetch(base + path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pommora-device': id,
        'x-pommora-timestamp': String(ts),
        'x-pommora-signature': signature,
      },
      body: json,
    })
    const text = await response.text()
    return { status: response.status, body: text.length > 0 ? JSON.parse(text) : null }
  }

  return { id, publicKey, name, x25519, call }
}
