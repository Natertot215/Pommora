import { landBytes, parseJsonObject, targetTaken } from '../../Files/atomicWrite'
import { stableStringify } from '../../Files/stableJson'
import { platformNameError } from '../../Paths/names'
import { dirname, join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import type { CaptureReason } from '../../Platform/stores'
import type { Change, ItemRecord } from '../Contract/wire'
import { deleteBase, readBase, recordBase, renameBase, upsertBase } from '../Client/base'
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

const parseObject = (bytes: Uint8Array): Json | null =>
  parseJsonObject(new TextDecoder().decode(bytes))

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

// A path another platform named but this host can't hold is passed over: it stays on the hub and every device that can hold it, and its cursor still advances here. A user-visible message about passed-over arrivals is a must-have to consider in any future sync work.
export const holdable = (rel: string): boolean =>
  rel.split('/').every((seg) => platformNameError(seg) === null)

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
    if (holdable(fromRel) && (await machine().stat(from)) !== null) {
      const losing = (await targetTaken(from, to)) ? await machine().readBytes(to) : null
      if (losing !== null) await captureLoser(root, change.path, losing, 'local-lost')
      await machine().mkdir(dirname(to))
      await machine().rename(from, to)
    }
    renameBase(fromRel, change.path)
    const moved = readBase(change.path)
    if (moved) upsertBase({ ...moved, version: change.seq })
  })
}
