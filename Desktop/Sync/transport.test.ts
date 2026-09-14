import { X509Certificate } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer as createHttpServer, type Server } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { transport } from './transport'

const cert = readFileSync(new URL('../../Sync/Testing/cert.pem', import.meta.url))
const key = readFileSync(new URL('../../Sync/Testing/key.pem', import.meta.url))
const PIN = new X509Certificate(cert).fingerprint256
const SENT = new Uint8Array([0x00, 0x61, 0xff, 0x80, 0x0a])

let server: Server | null = null

function listen(s: Server, scheme: 'http' | 'https'): Promise<string> {
  server = s
  s.on('request', (req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => res.end(Buffer.concat(chunks)))
  })
  return new Promise((resolve) =>
    s.listen(0, '127.0.0.1', () =>
      resolve(`${scheme}://127.0.0.1:${(s.address() as AddressInfo).port}/echo`),
    ),
  )
}

afterEach(async () => {
  const s = server
  server = null
  if (!s) return
  s.closeAllConnections()
  await new Promise((resolve) => s.close(resolve))
})

describe('transport', () => {
  it('carries bytes both ways under the right pin', async () => {
    const url = await listen(createHttpsServer({ cert, key }), 'https')
    const reply = await transport({ url, method: 'POST', headers: {}, body: SENT, pin: PIN })
    expect(reply.status).toBe(200)
    expect(reply.bytes).toEqual(SENT)
  })

  it('rejects a pin the certificate does not match', async () => {
    const url = await listen(createHttpsServer({ cert, key }), 'https')
    await expect(
      transport({ url, method: 'POST', headers: {}, body: SENT, pin: `AA:${PIN.slice(3)}` }),
    ).rejects.toThrow()
  })

  it('reaches an http: address without a pin', async () => {
    const url = await listen(createHttpServer(), 'http')
    const reply = await transport({ url, method: 'POST', headers: {}, body: 'hello' })
    expect(reply.status).toBe(200)
    expect(reply.body).toBe('hello')
  })
})
