import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { TLSSocket } from 'node:tls'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export function transport(req: TransportRequest): Promise<TransportReply> {
  const url = new URL(req.url)
  const secure = url.protocol === 'https:'
  const request = secure ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    if (req.pin !== undefined && !secure) {
      reject(new Error('A pinned request needs an https: address.'))
      return
    }
    const r = request(
      url,
      {
        method: req.method,
        headers: req.headers,
        // In the options the timeout covers the connect too; `setTimeout` arms only once connected.
        timeout: req.timeoutMs ?? 10_000,
        ...(secure && { rejectUnauthorized: req.pin === undefined }),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('error', reject)
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          resolve({
            status: res.statusCode ?? 0,
            get body() {
              return buf.toString('utf8')
            },
            bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
          })
        })
      },
    )
    r.on('timeout', () => r.destroy(new Error('The request timed out.')))
    r.on('error', reject)
    if (req.pin !== undefined) {
      const check = (socket: TLSSocket): void => {
        if (socket.getPeerCertificate().fingerprint256 !== req.pin) {
          r.destroy(new Error('The hub certificate does not match the pin.'))
        }
      }
      // A socket the agent reuses is already handshaken, so `secureConnect` has fired and will not fire again.
      r.on('socket', (socket) => {
        const tls = socket as TLSSocket
        if (tls.getPeerCertificate?.().fingerprint256) check(tls)
        else tls.once('secureConnect', () => check(tls))
      })
    }
    r.end(req.body)
  })
}
