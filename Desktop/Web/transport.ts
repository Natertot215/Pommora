import { net } from 'electron'
import type { TransportReply, TransportRequest } from '@pommora/core/Contract/handlers'

export async function transport(req: TransportRequest): Promise<TransportReply> {
  const r = await net.fetch(req.url, { method: req.method, headers: req.headers, body: req.body })
  return { status: r.status, body: await r.text() }
}
