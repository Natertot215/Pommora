import { createHash, randomUUID, X509Certificate } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer as httpsCreateServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import type * as Wire from '@pommora/core/Sync/Contract/wire'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { header, identify, type Routes, verify } from './authority.ts'
import { blobRoutes } from './Routes/blobs.ts'
import { itemRoutes } from './Routes/items.ts'
import { nexusRoutes } from './Routes/nexus.ts'
import { rosterRoutes } from './Routes/roster.ts'
import { openStore, type Store } from './Store/open.ts'
import {
  BLOB_CAP,
  BLOB_ROUTE,
  BLOB_TIMEOUT_MS,
  LOOPBACK,
  MALFORMED,
  META,
  PATHS,
  parseBody,
  refuse,
  type Reply,
  ROUTES,
  sha256Hex,
} from './wire.ts'

const PORT = Number(process.env.POMMORA_SYNC_PORT ?? 7473)
const DATA_DIR = process.env.POMMORA_SYNC_DATA ?? join(homedir(), '.pommora-sync')
const HOST = process.env.POMMORA_SYNC_HOST ?? LOOPBACK

function readCapped(req: IncomingMessage, cap: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= cap) chunks.push(chunk)
    })
    req.on('end', () => resolve(size > cap ? null : Buffer.concat(chunks)))
    req.on('close', () => resolve(null))
    req.on('error', reject)
  })
}

interface Spool {
  path: string
  size: number
  sha256Hex: string
}

function spoolBody(req: IncomingMessage, cap: number, dir: string): Promise<Spool | null> {
  const path = join(dir, 'spool', randomUUID())
  const file = createWriteStream(path)
  const hash = createHash('sha256')
  let size = 0
  let settled = false
  return new Promise((resolve, reject) => {
    const settle = (spool: Spool | null): void => {
      if (settled) return
      settled = true
      file.end(() => {
        if (spool === null) rmSync(path, { force: true })
        resolve(spool)
      })
    }
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > cap) return
      hash.update(chunk)
      if (!file.write(chunk)) {
        req.pause()
        file.once('drain', () => req.resume())
      }
    })
    req.on('end', () => settle(size > cap ? null : { path, size, sha256Hex: hash.digest('hex') }))
    req.on('close', () => settle(null))
    req.on('error', reject)
  })
}

interface Dispatch {
  store: Store
  routes: Routes<keyof Wire.RouteTable>
  blobs: ReturnType<typeof blobRoutes>
  dataDir: string
  timeoutMs: number | undefined
}

async function bytes(
  d: Dispatch,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  match: RegExpExecArray,
): Promise<Reply | 'streamed'> {
  const method = req.method
  if (method !== 'PUT' && method !== 'GET') return refuse(404, 'not-found')
  req.setTimeout(d.timeoutMs ?? BLOB_TIMEOUT_MS)
  const params = { nexusId: match[1], sha256: match[2] }
  const id = identify(
    d.store,
    req,
    null,
    null,
    params.nexusId,
    method === 'PUT' ? 'editor' : 'reader',
  )
  if ('status' in id) return id
  if (method === 'GET') {
    return verify(id, method, path, sha256Hex(Buffer.alloc(0))) ?? d.blobs.get(params, res)
  }
  const keyId = header(req, 'x-pommora-key')
  if (keyId === null || keyId.length > 64) return refuse(400, 'malformed')
  const spool = await spoolBody(req, BLOB_CAP, d.dataDir)
  if (spool === null) return refuse(413, 'too-large')
  try {
    const bad = verify(id, method, path, spool.sha256Hex)
    if (bad) return bad
    if (spool.sha256Hex !== params.sha256) return refuse(400, 'hash-mismatch')
    return d.blobs.put(params, keyId, spool)
  } finally {
    rmSync(spool.path, { force: true })
  }
}

async function route(
  d: Dispatch,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<Reply | 'streamed'> {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const blob = BLOB_ROUTE.exec(path)
  if (blob) return bytes(d, req, res, path, blob)
  if (req.method !== 'POST') return refuse(404, 'not-found')
  const name = ROUTES.find((r) => PATHS[r] === path)
  if (!name) return refuse(404, 'not-found')
  req.setTimeout(d.timeoutMs ?? META[name].timeoutMs)
  const raw = await readCapped(req, META[name].cap)
  if (!raw) return refuse(413, 'too-large')
  const body = parseBody(raw)
  if (body === MALFORMED) return refuse(400, 'malformed')
  const id = identify(d.store, req, name, body)
  if ('status' in id) return id
  const bad = verify(id, 'POST', path, sha256Hex(raw))
  if (bad) return bad
  return d.routes[name](id, body)
}

export async function start(opts: {
  dataDir: string
  port: number
  host?: string
  timeoutMs?: number
  tls?: { cert: string; key: string }
}): Promise<{ port: number; pin: string | null; close(): Promise<void> }> {
  const store = openStore(opts.dataDir)
  mkdirSync(join(opts.dataDir, 'spool'), { recursive: true })
  const d: Dispatch = {
    store,
    routes: { ...rosterRoutes(store), ...nexusRoutes(store), ...itemRoutes(store) },
    blobs: blobRoutes(store),
    dataDir: opts.dataDir,
    timeoutMs: opts.timeoutMs,
  }
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    const send = (reply: Reply): void => {
      if (res.headersSent) return
      res.writeHead(reply.status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(reply.body))
    }
    req.on('timeout', () => {
      res.once('finish', () => req.destroy())
      send(refuse(408, 'timeout'))
    })
    route(d, req, res)
      .catch((e) => {
        console.error('Sync request failed:', e)
        return refuse(500, 'internal')
      })
      .then((reply) => {
        if (reply !== 'streamed') send(reply)
      })
  }
  const server = opts.tls ? httpsCreateServer(opts.tls, handler) : createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port, opts.host ?? LOOPBACK, () => {
      server.off('error', reject)
      resolve()
    })
  })
  return {
    port: (server.address() as AddressInfo).port,
    pin: opts.tls ? new X509Certificate(opts.tls.cert).fingerprint256 : null,
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
  const certPath = join(DATA_DIR, 'hub-cert.pem')
  const keyPath = join(DATA_DIR, 'hub-key.pem')
  const tls =
    existsSync(certPath) && existsSync(keyPath)
      ? { cert: readFileSync(certPath, 'utf8'), key: readFileSync(keyPath, 'utf8') }
      : undefined
  void start({ dataDir: DATA_DIR, port: PORT, host: HOST, tls })
    .then(({ port, pin }) => {
      const scheme = pin ? 'https' : 'http'
      console.log(`Pommora Sync on ${scheme}://${HOST}:${port}${pin ? ` · pin ${pin}` : ''}`)
    })
    .catch((e) => {
      console.error('Pommora Sync failed to start:', e instanceof Error ? e.message : e)
      process.exitCode = 1
    })
}
