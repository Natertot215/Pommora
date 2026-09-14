import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { identify, verify } from './authority.ts'
import { rosterRoutes } from './Routes/roster.ts'
import { openStore, type Store } from './Store/open.ts'
import { MALFORMED, META, PATHS, parseBody, refuse, type Reply, ROUTES, sha256Hex } from './wire.ts'

const PORT = Number(process.env.POMMORA_SYNC_PORT ?? 7473)
const DATA_DIR = process.env.POMMORA_SYNC_DATA ?? join(homedir(), '.pommora-sync')
const HOST = '127.0.0.1'

function readCapped(req: IncomingMessage, cap: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= cap) chunks.push(chunk)
    })
    req.on('end', () => resolve(size > cap ? null : Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function route(
  store: Store,
  routes: ReturnType<typeof rosterRoutes>,
  req: IncomingMessage,
): Promise<Reply> {
  if (req.method !== 'POST') return refuse(404, 'not-found')
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const name = ROUTES.find((r) => PATHS[r] === path)
  if (!name) return refuse(404, 'not-found')
  const raw = await readCapped(req, META[name].cap)
  if (!raw) return refuse(413, 'too-large')
  const body = parseBody(raw)
  if (body === MALFORMED) return refuse(400, 'malformed')
  const id = identify(store, req, name, body)
  if (!('signed' in id)) return id
  const bad = verify(id, path, sha256Hex(raw))
  if (bad) return bad
  return routes[name](id, body)
}

export async function start(opts: {
  dataDir: string
  port: number
}): Promise<{ port: number; close(): Promise<void> }> {
  const store = openStore(opts.dataDir)
  const routes = rosterRoutes(store)
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    route(store, routes, req)
      .catch((e) => {
        console.error('Sync request failed:', e)
        return refuse(500, 'internal')
      })
      .then((reply) => {
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port, HOST, () => {
      server.off('error', reject)
      resolve()
    })
  })
  return {
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((e) => {
          store.db.close()
          if (e) reject(e)
          else resolve()
        })
      }),
  }
}

if (import.meta.main) {
  void start({ dataDir: DATA_DIR, port: PORT })
    .then(({ port }) => {
      console.log(`Pommora Sync on http://${HOST}:${port}`)
    })
    .catch((e) => {
      console.error('Pommora Sync failed to start:', e instanceof Error ? e.message : e)
      process.exitCode = 1
    })
}
