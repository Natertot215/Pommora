import { ulid } from 'ulidx'
import { isMarkdownFile, listPathsUnder } from '../../Files/walk'
import { manifestAdmits } from '../../Paths/exclusion'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { captureLoser } from '../Arrival/captures'
import { isMergedJson } from '../Arrival/jsonMerge'
import { landDelete, landRename, landWrite, newerSide, recordOf } from '../Arrival/land'
import type { Change, ItemRecord, StoreChange, StoreOutcome } from '../Contract/wire'
import { decryptItem, encryptItem } from '../Keys/item'
import { newest } from '../Keys/ring'
import {
  deleteBase,
  readAllBases,
  readBase,
  readSnapshot,
  recordBase,
  renameBase,
  type Snapshot,
  stampedId,
  upsertBase,
} from './base'
import { call, getBlob, putBlob } from './call'
import type { Session } from './session'
import { currentStatus, setStatus } from './status'

export const BATCH = 200
export const ITEM_CAP = 50 * 1024 * 1024

const owned = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(bytes)

const pathOf = (change: StoreChange): string =>
  change.kind === 'write' || change.kind === 'capture' ? change.record.path : change.path

function troubled(session: Session, paths: string[], why: string): void {
  for (const path of paths) session.failed.add(path)
  setStatus(session.ctx, { state: 'error', why })
}

const answered = (outcome: { status: number; error?: string }): string =>
  outcome.error ?? `The hub answered ${outcome.status}.`

async function storeChanges(session: Session, changes: StoreChange[]): Promise<StoreOutcome[]> {
  const outcomes: StoreOutcome[] = []
  for (let at = 0; at < changes.length; at += BATCH) {
    const slice = changes.slice(at, at + BATCH)
    const body = { nexusId: session.nexusId, requestId: ulid(), changes: slice }
    let outcome = await call(session.host, session.target, 'store', body)
    if (outcome.status === 0) outcome = await call(session.host, session.target, 'store', body)
    if (outcome.reply === null) {
      troubled(session, slice.map(pathOf), answered(outcome))
      continue
    }
    outcomes.push(...outcome.reply.outcomes)
  }
  return outcomes
}

async function shipBlob(
  session: Session,
  rel: string,
  keyId: string,
  blob: Uint8Array,
): Promise<boolean> {
  const outcome = await putBlob(session.host, session.target, session.nexusId, keyId, blob)
  if (outcome.status === 200) return true
  troubled(session, [rel], answered(outcome))
  return false
}

async function sealed(
  session: Session,
  rel: string,
  snapshot: Snapshot,
): Promise<{ record: ItemRecord; blob: Uint8Array } | null> {
  const key = newest(session.ring)
  const blob = await encryptItem(key, rel, owned(snapshot.bytes))
  if (!(await shipBlob(session, rel, key.keyId, blob))) return null
  return {
    record: {
      path: rel,
      mtimeMs: snapshot.mtimeMs,
      size: snapshot.size,
      keyId: key.keyId,
      sha256: machine().sha256Hex(blob),
    },
    blob,
  }
}

async function settle(
  session: Session,
  outcome: StoreOutcome,
  change: StoreChange,
  snapshot: Snapshot | undefined,
  blob: Uint8Array | undefined,
): Promise<void> {
  if (outcome.ok) {
    if (change.kind === 'delete') deleteBase(outcome.path)
    else if (change.kind === 'write' && snapshot !== undefined)
      recordBase(outcome.path, snapshot, outcome.version, change.record.sha256)
    return
  }
  if (outcome.why === 'stale') return resolveStale(session, outcome.path, outcome.head)
  if (change.kind !== 'write' || blob === undefined) return
  if (!(await shipBlob(session, outcome.path, change.record.keyId, blob))) return
  for (const again of await storeChanges(session, [change]))
    await settle(session, again, change, snapshot, undefined)
}

async function storeLocal(
  session: Session,
  rel: string,
  snapshot: Snapshot,
  change: (record: ItemRecord) => StoreChange,
): Promise<void> {
  const item = await sealed(session, rel, snapshot)
  if (item === null) return
  const one = change(item.record)
  for (const outcome of await storeChanges(session, [one]))
    await settle(session, outcome, one, snapshot, item.blob)
}

export async function pushDirty(session: Session, rels: string[]): Promise<void> {
  const { root } = session
  const admits = manifestAdmits(session.scope)
  const changes: StoreChange[] = []
  const snapshots = new Map<string, Snapshot>()
  const blobs = new Map<string, Uint8Array>()

  const collect = async (rel: string): Promise<void> => {
    const abs = join(root, rel)
    const stat = await machine().stat(abs)
    if (stat?.isDirectory === true) {
      const under = new Set([
        ...readAllBases()
          .map((row) => row.path)
          .filter((path) => path.startsWith(`${rel}/`)),
        ...(await listPathsUnder(root, abs, (child, _kind, siblings) => admits(child, siblings))),
      ])
      for (const child of under) await collect(child)
      return
    }
    if (stat === null) {
      const row = readBase(rel)
      if (row !== null) {
        changes.push({ kind: 'delete', base: row.version, path: rel })
        return
      }
      for (const under of readAllBases())
        if (under.path.startsWith(`${rel}/`))
          changes.push({ kind: 'delete', base: under.version, path: under.path })
      return
    }
    const snapshot = await readSnapshot(root, rel)
    if (snapshot === null) return
    if (snapshot.hash === readBase(rel)?.hash) return
    if (snapshot.size > ITEM_CAP) {
      setStatus(session.ctx, { ...currentStatus(), why: `${rel} is over 50 MB and stays home.` })
      return
    }
    if (isMarkdownFile(rel) && (await stampedId(root, rel)) === null) return
    const item = await sealed(session, rel, snapshot)
    if (item === null) return
    snapshots.set(rel, snapshot)
    blobs.set(rel, item.blob)
    changes.push({ kind: 'write', base: snapshot.version, record: item.record })
  }

  for (const rel of rels) await collect(rel)
  const ordered = [
    ...changes.filter((change) => change.kind === 'delete'),
    ...changes.filter((change) => change.kind !== 'delete'),
  ]
  const byPath = new Map(ordered.map((change) => [pathOf(change), change]))
  for (const outcome of await storeChanges(session, ordered)) {
    const change = byPath.get(outcome.path)
    if (change !== undefined)
      await settle(session, outcome, change, snapshots.get(outcome.path), blobs.get(outcome.path))
  }
}

export async function pushRename(session: Session, from: string, to: string): Promise<void> {
  const own = readBase(from)
  const rows =
    own !== null ? [own] : readAllBases().filter((row) => row.path.startsWith(`${from}/`))
  if (rows.length === 0) return pushDirty(session, [to])
  const moved = rows.map((row) => ({ row, path: to + row.path.slice(from.length) }))
  const changes: StoreChange[] = moved.map(({ row, path }) => ({
    kind: 'rename',
    base: row.version,
    from: row.path,
    path,
  }))
  const byPath = new Map(moved.map((entry) => [entry.path, entry]))
  for (const outcome of await storeChanges(session, changes)) {
    const entry = byPath.get(outcome.path)
    if (entry === undefined) continue
    renameBase(entry.row.path, entry.path)
    if (outcome.ok) upsertBase({ ...entry.row, path: entry.path, version: outcome.version })
    else if (outcome.why === 'stale') await resolveStale(session, entry.path, outcome.head)
  }
}

export async function resolveStale(
  session: Session,
  rel: string,
  head: Change | null,
): Promise<void> {
  const { host, root, ring, target, nexusId } = session
  if (head === null) {
    deleteBase(rel)
    return pushDirty(session, [rel])
  }
  if (head.kind === 'rename' && head.path !== rel) {
    await landRename(root, head)
    return resolveStale(session, head.path, head)
  }
  const snapshot = await readSnapshot(root, rel)
  if (head.kind === 'delete') {
    if (snapshot === null) {
      deleteBase(rel)
      return
    }
    if (newerSide(snapshot.mtimeMs, host.device.id, head.atMs, head.device) === 'local')
      return storeLocal(session, rel, snapshot, (record) => ({
        kind: 'write',
        base: null,
        record,
      }))
    await captureLoser(root, rel, snapshot.bytes, 'tombstone-lost')
    return landDelete(root, head)
  }
  const record = recordOf(head)
  const blob = await getBlob(host, target, nexusId, record.sha256)
  if (blob === null) {
    troubled(session, [rel], `The hub holds no bytes for ${rel}.`)
    return
  }
  const remote = await decryptItem(ring, record.keyId, record.path, owned(blob))
  if (snapshot !== null && machine().sha256Hex(remote) === snapshot.hash) {
    recordBase(rel, snapshot, head.seq, record.sha256)
    return
  }
  if (snapshot === null || isMergedJson(rel)) return landWrite(host, root, head, remote)
  if (newerSide(snapshot.mtimeMs, host.device.id, record.mtimeMs, head.device) === 'local') {
    await captureLoser(root, rel, remote, 'remote-lost')
    return storeLocal(session, rel, snapshot, (item) => ({
      kind: 'write',
      base: head.seq,
      record: item,
    }))
  }
  await captureLoser(root, rel, snapshot.bytes, 'local-lost')
  await storeLocal(session, rel, snapshot, (item) => ({ kind: 'capture', record: item }))
  return landWrite(host, root, head, remote)
}
