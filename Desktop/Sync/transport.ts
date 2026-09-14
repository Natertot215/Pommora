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
          const bytes = new Uint8Array(Buffer.concat(chunks))
          resolve({ status: res.statusCode ?? 0, body: Buffer.from(bytes).toString('utf8'), bytes })
        })
      },
    )
    r.setTimeout(req.timeoutMs ?? 10_000, () => r.destroy(new Error('The request timed out.')))
    r.on('error', reject)
    if (req.pin !== undefined) {
      r.on('socket', (socket) => {
        socket.once('secureConnect', () => {
          const seen = (socket as TLSSocket).getPeerCertificate().fingerprint256
          if (seen !== req.pin) r.destroy(new Error('The hub certificate does not match the pin.'))
        })
      })
    }
    r.end(req.body)
  })
}
