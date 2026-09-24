import { ulid } from 'ulidx'
import { isMarkdownFile, listPathsUnder } from '../../Files/walk'
import { stampedId } from '../../Files/pageFile'
import { manifestAdmits } from '../../Paths/exclusion'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { captureLoser } from '../Arrival/captures'
import { isMergedJson } from '../Arrival/jsonMerge'
import { landDelete, landRename, landWrite, newerSide, recordOf } from '../Arrival/land'
import type { Change, ItemRecord, StoreChange, StoreOutcome } from '../Contract/wire'
import { encryptItem } from '../Keys/item'
import { newest, owned } from '../Keys/ring'
import { openRecord } from './keyring'
import {
  deleteBase,
  readBase,
  readBasesUnder,
  readSnapshot,
  recordBase,
  renameBase,
  type Snapshot,
  upsertBase,
} from './base'
import { call, getBlob, putBlob } from './call'
import type { Session } from './session'
import { setStatus } from './status'

const BATCH = 200
export const ITEM_CAP = 50 * 1024 * 1024

const pathOf = (change: StoreChange): string =>
  change.kind === 'write' || change.kind === 'capture' ? change.record.path : change.path

const failedPaths = (change: StoreChange): string[] =>
  change.kind === 'rename' ? [change.from, change.path] : [pathOf(change)]

function troubled(session: Session, paths: string[], why: string): void {
  for (const path of paths) session.failed.add(path)
  setStatus(session.ctx, { state: 'error', why })
}

export const answered = (outcome: { status: number; error?: string }): string =>
  outcome.error ?? `The hub answered ${outcome.status}.`

async function storeChanges(session: Session, changes: StoreChange[]): Promise<StoreOutcome[]> {
  const outcomes: StoreOutcome[] = []
  for (let at = 0; at < changes.length; at += BATCH) {
    const slice = changes.slice(at, at + BATCH)
    const body = { nexusId: session.nexusId, requestId: ulid(), changes: slice }
    let outcome = await call(session.host, session.target, 'store', body)
    if (outcome.status === 0) outcome = await call(session.host, session.target, 'store', body)
    if (outcome.reply === null) {
      if (outcome.status === 400) setStatus(session.ctx, { state: 'error', why: answered(outcome) })
      else troubled(session, slice.flatMap(failedPaths), answered(outcome))
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
  switch (outcome.why) {
    case 'stale':
      return resolveStale(session, outcome.path, outcome.head)
    case 'missing-blob': {
      if (change.kind !== 'write' || blob === undefined) return
      if (!(await shipBlob(session, outcome.path, change.record.keyId, blob))) return
      for (const again of await storeChanges(session, [change]))
        await settle(session, again, change, snapshot, undefined)
      return
    }
  }
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

export async function pushDirty(session: Session, rels: string[], sweep = false): Promise<void> {
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
        ...readBasesUnder(rel).map((row) => row.path),
        ...(await listPathsUnder(root, abs, (child, _kind, siblings) => admits(child, siblings))),
      ])
      for (const child of under) await collect(child)
      return
    }
    if (stat === null) {
      const gone = readBase(rel)
      if (gone !== null) {
        changes.push({ kind: 'delete', base: gone.version, path: rel })
        return
      }
      for (const under of readBasesUnder(rel))
        changes.push({ kind: 'delete', base: under.version, path: under.path })
      return
    }
    const row = readBase(rel)
    if (sweep && row !== null && Math.floor(stat.mtimeMs) === row.mtimeMs && stat.size === row.size)
      return
    if (stat.size > ITEM_CAP) {
      setStatus(session.ctx, { state: 'error', why: `${rel} is over 50 MB and stays home.` })
      return
    }
    const snapshot = await readSnapshot(root, rel)
    if (snapshot === null) return
    if (snapshot.hash === row?.hash) return
    if (isMarkdownFile(rel) && stampedId(new TextDecoder().decode(snapshot.bytes)) === null) return
    if (rel.normalize('NFC') !== rel) {
      setStatus(session.ctx, { state: 'error', why: `${rel} is not NFC and stays home.` })
      return
    }
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
  const rows = own !== null ? [own] : readBasesUnder(from)
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
  return pushDirty(session, [to])
}

export async function resolveStale(
  session: Session,
  rel: string,
  head: Change | null,
  heads: ReadonlyMap<string, Change> = new Map(),
): Promise<void> {
  const { host, root, target, nexusId } = session
  if (head === null) {
    deleteBase(rel)
    return pushDirty(session, [rel])
  }
  if (head.kind === 'rename' && head.path !== rel) {
    await landRename(root, head)
    return resolveStale(session, head.path, heads.get(head.path) ?? head, heads)
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
    return landDelete(root, head, 'tombstone-lost')
  }
  const record = recordOf(head)
  const blob = await getBlob(host, target, nexusId, record.sha256)
  if (blob === null) {
    troubled(session, [rel], `The hub holds no bytes for ${rel}.`)
    return
  }
  const remote = await openRecord(session, record, blob)
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
  await storeLocal(session, rel, snapshot, (item) => ({ kind: 'capture', record: item }))
  return landWrite(host, root, head, remote)
}
