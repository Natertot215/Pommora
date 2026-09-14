import type { TransportReply, TransportRequest } from '../Contract/handlers'
import type {
  Change,
  DeviceRecord,
  InfoRecord,
  ItemRecord,
  PullReply,
  StoreBody,
  StoreOutcome,
  StoreReply,
} from '../Sync/Contract/wire'
import { replyOf } from './transportReplies'

export interface HubItem {
  version: number
  deleted: boolean
}

export interface FakeHub {
  seq: number
  atMs: number
  device: string
  changes: Change[]
  items: Map<string, HubItem>
  blobs: Map<string, Uint8Array>
  captures: ItemRecord[]
  requests: Map<string, StoreReply>
  sent: TransportRequest[]
  info: InfoRecord | null
  devices: DeviceRecord[]
  intercept: ((req: TransportRequest) => 'throw' | Omit<TransportReply, 'bytes'> | null) | null
  transport(req: TransportRequest): Promise<TransportReply>
}

const PAGE = 200

const json = (status: number, body: unknown): Omit<TransportReply, 'bytes'> => ({
  status,
  body: JSON.stringify(body),
})

const MISSING = json(404, { error: 'not-found' })

const liveOf = (hub: FakeHub, path: string): HubItem | null => {
  const row = hub.items.get(path)
  return row !== undefined && !row.deleted ? row : null
}

function headOf(hub: FakeHub, path: string): Change | null {
  for (let at = hub.changes.length - 1; at >= 0; at -= 1) {
    const change = hub.changes[at]
    if (change.path === path || change.from === path) return change
  }
  return null
}

const recordAt = (hub: FakeHub, seq: number): ItemRecord | null =>
  hub.changes.find((change) => change.seq === seq)?.record ?? null

function apply(hub: FakeHub, body: StoreBody): StoreReply {
  const outcomes: StoreOutcome[] = []
  const stale = (path: string, at: string = path): StoreOutcome => ({
    path,
    ok: false,
    why: 'stale',
    head: headOf(hub, at),
  })
  for (const change of body.changes) {
    if (change.kind === 'capture') {
      const { path, sha256 } = change.record
      if (!hub.blobs.has(sha256)) {
        outcomes.push({ path, ok: false, why: 'missing-blob' })
        continue
      }
      hub.captures.push(change.record)
      outcomes.push({ path, ok: true, version: hub.seq })
      continue
    }
    const path = change.kind === 'write' ? change.record.path : change.path
    const source = change.kind === 'rename' ? change.from : path
    const live = liveOf(hub, source)
    if (change.kind === 'write' && change.base === null) {
      if (live !== null) {
        outcomes.push(stale(path))
        continue
      }
    } else if (live === null || live.version !== change.base) {
      outcomes.push(stale(path, source))
      continue
    }
    if (change.kind === 'write' && !hub.blobs.has(change.record.sha256)) {
      outcomes.push({ path, ok: false, why: 'missing-blob' })
      continue
    }
    if (change.kind === 'rename' && liveOf(hub, path) !== null) {
      outcomes.push(stale(path))
      continue
    }
    hub.seq += 1
    const seq = hub.seq
    const at = { device: hub.device, atMs: hub.atMs }
    if (change.kind === 'write') {
      hub.changes.push({ seq, kind: 'write', path, record: change.record, ...at })
      hub.items.set(path, { version: seq, deleted: false })
    } else if (change.kind === 'delete') {
      hub.changes.push({ seq, kind: 'delete', path, ...at })
      hub.items.set(path, { version: seq, deleted: true })
    } else {
      const moved = live === null ? null : recordAt(hub, live.version)
      hub.items.delete(path)
      hub.items.delete(change.from)
      hub.items.set(path, { version: seq, deleted: false })
      hub.changes.push({
        seq,
        kind: 'rename',
        path,
        from: change.from,
        ...(moved !== null && { record: moved }),
        ...at,
      })
    }
    outcomes.push({ path, ok: true, version: seq })
  }
  return { outcomes, seq: hub.seq }
}

function readChanges(hub: FakeHub, cursor: number): PullReply {
  const rows = hub.changes.filter((change) => change.seq > cursor)
  const hasMore = rows.length > PAGE
  const changes = rows.slice(0, PAGE)
  return { changes, cursor: changes.at(-1)?.seq ?? cursor, hasMore }
}

function route(hub: FakeHub, req: TransportRequest): Omit<TransportReply, 'bytes'> | Uint8Array {
  const path = new URL(req.url).pathname
  if (path.startsWith('/blob/')) {
    const sha = path.split('/')[3]
    if (req.method === 'PUT') {
      hub.blobs.set(sha, new Uint8Array(req.body as Uint8Array))
      return json(200, { sha256: sha })
    }
    return hub.blobs.get(sha) ?? MISSING
  }
  const body = JSON.parse(String(req.body ?? '{}')) as StoreBody & { cursor?: number }
  switch (path) {
    case '/store': {
      const known = hub.requests.get(body.requestId)
      if (known !== undefined) return json(200, known)
      const reply = apply(hub, body)
      hub.requests.set(body.requestId, reply)
      return json(200, reply)
    }
    case '/pull': {
      const cursor = body.cursor ?? 0
      return cursor > hub.seq
        ? json(409, { error: 'resync', seq: hub.seq })
        : json(200, readChanges(hub, cursor))
    }
    case '/info':
      return hub.info === null ? MISSING : json(200, { info: hub.info })
    case '/devices':
      return json(200, { devices: hub.devices })
    default:
      return MISSING
  }
}

export function fakeHub(device = 'hub'): FakeHub {
  const hub: FakeHub = {
    seq: 0,
    atMs: Date.UTC(2026, 8, 1, 12),
    device,
    changes: [],
    items: new Map(),
    blobs: new Map(),
    captures: [],
    requests: new Map(),
    sent: [],
    info: null,
    devices: [],
    intercept: null,
    transport: async (req) => {
      hub.sent.push(req)
      const taken = hub.intercept?.(req) ?? null
      if (taken === 'throw') throw new Error('the transport refused')
      if (taken !== null) return replyOf(taken)
      const answer = route(hub, req)
      return answer instanceof Uint8Array
        ? { status: 200, body: '', bytes: answer }
        : replyOf(answer)
    },
  }
  return hub
}
