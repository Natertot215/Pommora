import { landBytes, parseJsonText } from '../../Files/atomicWrite'
import { stableStringify } from '../../Files/stableJson'
import { getLiveTree } from '../../Nexus/liveTree'
import { tileHostAt } from '../../Nexus/watchPatch'
import { tileBodyUnder } from '../../Nexus/watchSettle'
import { dirname, join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import type { CaptureReason } from '../../Platform/stores'
import { isPlainObject } from '../../Properties/propertyValue'
import type { Change, ItemRecord } from '../Contract/wire'
import {
  deleteBase,
  readBase,
  readBasesUnder,
  recordBase,
  renameBase,
  upsertBase,
} from '../Client/base'
import type { SyncHost } from '../Client/call'
import { captureLoser } from './captures'
import { type Json, isMergedJson, mergeDepthFor, mergeKeys } from './jsonMerge'

const RECENCY_WINDOW_MS = 2_000

export function newerSide(
  localMtimeMs: number,
  localDeviceId: string,
  remoteMtimeMs: number,
  remoteDeviceId: string,
): 'local' | 'remote' {
  const gap = localMtimeMs - remoteMtimeMs
  if (gap > RECENCY_WINDOW_MS) return 'local'
  if (gap < -RECENCY_WINDOW_MS) return 'remote'
  return localDeviceId < remoteDeviceId ? 'local' : 'remote'
}

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)

function parseObject(bytes: Uint8Array): Json | null {
  try {
    const value = parseJsonText(new TextDecoder().decode(bytes))
    return isPlainObject(value) ? value : null
  } catch {
    return null
  }
}

export function recordOf(change: Change): ItemRecord {
  if (!change.record) throw new Error(`Change ${change.seq} on ${change.path} carries no record.`)
  return change.record
}

async function bytesToLand(
  localDeviceId: string,
  abs: string,
  change: Change,
  record: ItemRecord,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  if (!isMergedJson(change.path)) return plaintext
  const local = await machine().readBytes(abs)
  if (!local) return plaintext
  const base = readBase(change.path)?.baseBytes ?? null
  if (base && machine().sha256Hex(local) === machine().sha256Hex(base)) return plaintext
  const b = base ? parseObject(base) : {}
  const l = parseObject(local)
  const r = parseObject(plaintext)
  if (!b || !l || !r) return plaintext
  const localMtimeMs = (await machine().stat(abs))?.mtimeMs ?? 0
  const merged = mergeKeys(b, l, r, mergeDepthFor(change.path), () =>
    newerSide(localMtimeMs, localDeviceId, record.mtimeMs, change.device),
  )
  return utf8(`${stableStringify(merged)}\n`)
}

function announceTile(host: SyncHost, rel: string): void {
  if (!tileBodyUnder(rel.split('/'), rel)) return
  const tree = getLiveTree()
  const ref = tree && tileHostAt(tree, rel)
  if (ref) host.push('tiles:changed', ref)
}

async function captureUnrecorded(
  root: string,
  rel: string,
  landing: string | null,
  reason: CaptureReason,
): Promise<void> {
  const local = await machine().readBytes(join(root, rel))
  if (local === null) return
  const hash = machine().sha256Hex(local)
  if (hash !== readBase(rel)?.hash && hash !== landing) await captureLoser(root, rel, local, reason)
}

export async function landWrite(
  host: SyncHost,
  root: string,
  change: Change,
  plaintext: Uint8Array,
): Promise<void> {
  const record = recordOf(change)
  const abs = join(root, change.path)
  const hash = machine().sha256Hex(plaintext)
  await machine().lock(abs, async () => {
    await machine().mkdir(dirname(abs))
    const bytes = await bytesToLand(host.device.id, abs, change, record, plaintext)
    if (bytes === plaintext) await captureUnrecorded(root, change.path, hash, 'local-lost')
    await landBytes(abs, bytes, bytes === plaintext ? record.mtimeMs : Date.now())
    recordBase(
      change.path,
      { mtimeMs: record.mtimeMs, size: plaintext.length, hash, bytes: plaintext },
      change.seq,
      record.sha256,
    )
    announceTile(host, change.path)
  })
}

export async function landDelete(
  root: string,
  change: Change,
  reason: CaptureReason = 'local-lost',
): Promise<void> {
  const abs = join(root, change.path)
  await machine().lock(abs, async () => {
    if (await machine().stat(abs)) {
      await captureUnrecorded(root, change.path, null, reason)
      await machine().remove(abs)
      const parent = dirname(abs)
      if (parent !== root && (await machine().readDir(parent)).length === 0)
        await machine().remove(parent)
    }
    deleteBase(change.path)
  })
}

export async function landRename(root: string, change: Change): Promise<void> {
  const fromRel = change.from
  if (fromRel === undefined)
    throw new Error(`Rename ${change.seq} to ${change.path} carries no source path.`)
  const from = join(root, fromRel)
  const to = join(root, change.path)
  await machine().lock(from, async () => {
    const source = await machine().stat(from)
    if (source !== null) {
      if (!source.isDirectory) {
        const losing = await machine().readBytes(to)
        if (losing !== null) await captureLoser(root, change.path, losing, 'local-lost')
      }
      await machine().mkdir(dirname(to))
      await machine().rename(from, to)
    }
    for (const row of readBasesUnder(fromRel))
      renameBase(row.path, change.path + row.path.slice(fromRel.length))
    renameBase(fromRel, change.path)
    const moved = readBase(change.path)
    if (moved) upsertBase({ ...moved, version: change.seq })
  })
}
