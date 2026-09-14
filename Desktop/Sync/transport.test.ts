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

  it('refuses a mismatched pin on a socket the agent reused', async () => {
    const s = createHttpsServer({ cert, key })
    let handshakes = 0
    s.on('secureConnection', () => handshakes++)
    const url = await listen(s, 'https')
    await transport({ url, method: 'POST', headers: {}, body: SENT, pin: PIN })
    await expect(
      transport({ url, method: 'POST', headers: {}, body: SENT, pin: `AA:${PIN.slice(3)}` }),
    ).rejects.toThrow()
    expect(handshakes).toBe(1)
  })

  it('gives up on an address that never connects within the timeout', async () => {
    const started = Date.now()
    await expect(
      transport({
        url: 'https://192.0.2.1:7473/echo',
        method: 'POST',
        headers: {},
        body: SENT,
        pin: PIN,
        timeoutMs: 300,
      }),
    ).rejects.toThrow()
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('refuses a pinned request to an http: address rather than sending it in the clear', async () => {
    const url = await listen(createHttpServer(), 'http')
    await expect(
      transport({ url, method: 'POST', headers: {}, body: SENT, pin: PIN }),
    ).rejects.toThrow('A pinned request needs an https: address.')
  })

  it('reaches an http: address without a pin', async () => {
    const url = await listen(createHttpServer(), 'http')
    const reply = await transport({ url, method: 'POST', headers: {}, body: 'hello' })
    expect(reply.status).toBe(200)
    expect(reply.body).toBe('hello')
  })
})
