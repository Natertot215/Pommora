import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { TLSSocket } from 'node:tls'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export function transport(req: TransportRequest): Promise<TransportReply> {
  const url = new URL(req.url)
  const secure = url.protocol === 'https:'
  const request = secure ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const r = request(
      url,
      {
        method: req.method,
        headers: req.headers,
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
            body: buf.toString('utf8'),
            bytes: new Uint8Array(buf),
          })
        })
      },
    )
    r.setTimeout(req.timeoutMs ?? 10_000, () => r.destroy(new Error('The request timed out.')))
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
