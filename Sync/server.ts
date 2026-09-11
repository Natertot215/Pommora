import { createHash, createPublicKey, verify } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/contract'

const PORT = Number(process.env.POMMORA_SYNC_PORT ?? 7473)
const DATA_DIR = process.env.POMMORA_SYNC_DATA ?? join(homedir(), '.pommora-sync')
const HOST = '127.0.0.1'
const BODY_CAP = 8192
const WINDOW_MS = 5 * 60_000
const SCHEMA_VERSION = 1

// Core's validators and canonical string, re-spelled so the server stays on built-ins alone.
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/
const PUBLIC_KEY = /^[A-Za-z0-9_-]{43}$/

function fingerprintOf(publicKey: string): string {
  return createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex')
}

export function canonical(method: string, path: string, rawBody: Buffer, ts: number): string {
  const bodySha256 = createHash('sha256').update(rawBody).digest('hex')
  return [method.toUpperCase(), path, bodySha256, String(ts)].join('\n')
}

const PATHS = {
  connect: '/connect',
  devices: '/devices',
  approve: '/approve',
  revoke: '/revoke',
} as const satisfies { [K in keyof Wire.RouteTable]: Wire.RouteTable[K]['path'] }

const ROUTES = Object.keys(PATHS) as (keyof Wire.RouteTable)[]

const DDL = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS device (
    fingerprint TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS membership (
    nexus_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    approved INTEGER NOT NULL,
    PRIMARY KEY (nexus_id, fingerprint)
  );`

function openDb(dir: string): DatabaseSync {
  mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(join(dir, 'sync.db'))
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(DDL)
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')
  if (!row) {
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(
      'schema_version',
      String(SCHEMA_VERSION),
    )
  }
  return db
}

type Reply = { status: number; body: object }

function refuse(status: number, error: string): Reply {
  return { status, body: { error } }
}

function verbs(db: DatabaseSync) {
  const listStatement = db.prepare(
    `SELECT d.fingerprint AS id, d.public_key AS publicKey, d.name AS name, m.approved AS approved
     FROM membership m JOIN device d ON d.fingerprint = m.fingerprint
     WHERE m.nexus_id = ? ORDER BY d.name`,
  )
  const approvedStatement = db.prepare(
    'SELECT 1 FROM membership WHERE nexus_id = ? AND fingerprint = ? AND approved = 1',
  )

  const list = (nexusId: string): Wire.DeviceRecord[] => {
    const rows = listStatement.all(nexusId) as {
      id: string
      publicKey: string
      name: string
      approved: number
    }[]
    return rows.map((r) => ({
      id: r.id,
      publicKey: r.publicKey,
      name: r.name,
      approved: r.approved === 1,
    }))
  }

  const nexusOf = (body: unknown): string | null => {
    const id = (body as Partial<Wire.NexusBody> | null)?.nexusId
    return typeof id === 'string' && ULID.test(id) ? id : null
  }

  const targetOf = (body: unknown): string | null => {
    const id = (body as Partial<Wire.DeviceBody> | null)?.deviceId
    return typeof id === 'string' && id.length > 0 ? id : null
  }

  return {
    connect: (caller: string, body: unknown): Reply => {
      const b = body as Partial<Wire.ConnectBody> | null
      const nexusId = nexusOf(b)
      const publicKey = b?.publicKey
      const name = typeof b?.name === 'string' ? b.name.trim() : ''
      if (!nexusId || typeof publicKey !== 'string' || !PUBLIC_KEY.test(publicKey)) {
        return refuse(400, 'malformed')
      }
      if (name.length < 1 || name.length > 64) return refuse(400, 'malformed')
      db.prepare(
        `INSERT INTO device (fingerprint, public_key, name) VALUES (?, ?, ?)
         ON CONFLICT(fingerprint) DO UPDATE SET public_key = excluded.public_key, name = excluded.name`,
      ).run(caller, publicKey, name)
      const seeded = db.prepare('SELECT 1 FROM membership WHERE nexus_id = ?').get(nexusId)
      db.prepare(
        `INSERT INTO membership (nexus_id, fingerprint, approved) VALUES (?, ?, ?)
         ON CONFLICT DO NOTHING`,
      ).run(nexusId, caller, seeded ? 0 : 1)
      const row = approvedStatement.get(nexusId, caller)
      return { status: 200, body: { approved: Boolean(row) } }
    },

    devices: (caller: string, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      if (!nexusId) return refuse(400, 'malformed')
      if (!approvedStatement.get(nexusId, caller)) return refuse(404, 'not-found')
      return { status: 200, body: { devices: list(nexusId) } }
    },

    approve: (caller: string, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      const deviceId = targetOf(body)
      if (!nexusId || !deviceId) return refuse(400, 'malformed')
      if (!approvedStatement.get(nexusId, caller)) return refuse(404, 'not-found')
      const changed = db
        .prepare('UPDATE membership SET approved = 1 WHERE nexus_id = ? AND fingerprint = ?')
        .run(nexusId, deviceId).changes
      if (changed === 0) return refuse(409, 'no-such-device')
      return { status: 200, body: { devices: list(nexusId) } }
    },

    revoke: (caller: string, body: unknown): Reply => {
      const nexusId = nexusOf(body)
      const deviceId = targetOf(body)
      if (!nexusId || !deviceId) return refuse(400, 'malformed')
      if (!approvedStatement.get(nexusId, caller)) return refuse(404, 'not-found')
      if (deviceId === caller) return refuse(400, 'self-revoke')
      db.prepare('DELETE FROM membership WHERE nexus_id = ? AND fingerprint = ?').run(
        nexusId,
        deviceId,
      )
      return { status: 200, body: { devices: list(nexusId) } }
    },
  } satisfies { [K in keyof Wire.RouteTable]: (caller: string, body: unknown) => Reply }
}

type Signature = { device: string; ts: number; sig: string }

function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function signatureOf(req: IncomingMessage): Signature | null {
  const device = header(req, 'x-pommora-device')
  const rawTs = header(req, 'x-pommora-timestamp')
  const sig = header(req, 'x-pommora-signature')
  if (!device || !rawTs || !sig) return null
  const ts = Number(rawTs)
  if (!Number.isInteger(ts) || Math.abs(Date.now() - ts) > WINDOW_MS) return null
  return { device, ts, sig }
}

function verifySigned(
  path: string,
  rawBody: Buffer,
  signed: Signature,
  publicKey: string,
): Reply | null {
  try {
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: publicKey },
      format: 'jwk',
    })
    const data = Buffer.from(canonical('POST', path, rawBody, signed.ts), 'utf8')
    return verify(null, data, key, Buffer.from(signed.sig, 'base64url'))
      ? null
      : refuse(401, 'unauthorized')
  } catch {
    return refuse(400, 'bad-key')
  }
}

function readBody(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= BODY_CAP) chunks.push(chunk)
    })
    req.on('end', () => resolve(size > BODY_CAP ? null : Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const MALFORMED = Symbol('malformed')

function parseBody(raw: Buffer): unknown {
  if (raw.length === 0) return null
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return MALFORMED
  }
}

async function route(
  db: DatabaseSync,
  handlers: ReturnType<typeof verbs>,
  req: IncomingMessage,
): Promise<Reply> {
  if (req.method !== 'POST') return refuse(404, 'not-found')
  const raw = await readBody(req)
  if (!raw) return refuse(413, 'too-large')
  const path = new URL(req.url ?? '/', `http://${HOST}`).pathname
  const name = ROUTES.find((r) => PATHS[r] === path)
  if (!name) return refuse(404, 'not-found')
  const signed = signatureOf(req)
  if (!signed) return refuse(401, 'unauthorized')

  if (name === 'connect') {
    const body = parseBody(raw)
    if (body === MALFORMED) return refuse(400, 'malformed')
    const publicKey = (body as Partial<Wire.ConnectBody> | null)?.publicKey
    if (typeof publicKey !== 'string' || !PUBLIC_KEY.test(publicKey)) {
      return refuse(400, 'malformed')
    }
    if (fingerprintOf(publicKey) !== signed.device) return refuse(401, 'unauthorized')
    const bad = verifySigned(path, raw, signed, publicKey)
    if (bad) return bad
    return handlers.connect(signed.device, body)
  }

  const row = db
    .prepare('SELECT public_key FROM device WHERE fingerprint = ?')
    .get(signed.device) as { public_key: string } | undefined
  if (!row) return refuse(404, 'not-found')
  const bad = verifySigned(path, raw, signed, row.public_key)
  if (bad) return bad
  const body = parseBody(raw)
  if (body === MALFORMED) return refuse(400, 'malformed')
  return handlers[name](signed.device, body)
}

export async function start(opts: {
  dataDir: string
  port: number
}): Promise<{ port: number; close(): Promise<void> }> {
  const db = openDb(opts.dataDir)
  const handlers = verbs(db)
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    route(db, handlers, req)
      .catch((e) => {
        console.error('Sync request failed:', e)
        return refuse(500, 'internal')
      })
      .then((reply) => {
        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      })
  })
  await new Promise<void>((resolve) => {
    server.listen(opts.port, HOST, resolve)
  })
  return {
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((e) => {
          db.close()
          if (e) reject(e)
          else resolve()
        })
      }),
  }
}

if (import.meta.main) {
  void start({ dataDir: DATA_DIR, port: PORT }).then(({ port }) => {
    console.log(`Pommora Sync on http://${HOST}:${port}`)
  })
}
